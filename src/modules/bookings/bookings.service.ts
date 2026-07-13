import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking, BookingDocument } from './schemas/booking.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    userId: string,
    createBookingDto: CreateBookingDto,
  ): Promise<BookingDocument> {
    const booking = new this.bookingModel({
      owner: new Types.ObjectId(userId),
      provider: new Types.ObjectId(createBookingDto.providerId),
      providerType: createBookingDto.providerType,
      pet: createBookingDto.petId
        ? new Types.ObjectId(createBookingDto.petId)
        : undefined,
      serviceType: createBookingDto.serviceType,
      description: createBookingDto.description,
      dateTime: new Date(createBookingDto.dateTime),
      duration: createBookingDto.duration,
      price: createBookingDto.price,
      status: 'pending',
    });

    const savedBooking = await booking.save();
    await savedBooking.populate([
      { path: 'owner', select: 'name email profileImage' },
      { path: 'provider', select: 'name email profileImage' },
      { path: 'pet', select: 'name species breed' },
    ]);

    // Create notification for the provider (vet/sitter)
    await this.notificationsService.create({
      recipientId: createBookingDto.providerId,
      senderId: userId,
      type: 'booking_request',
      title: 'New Booking Request',
      message: `You have received a new ${createBookingDto.serviceType} booking request.`,
      bookingId: String(savedBooking._id),
      metadata: {
        bookingId: String(savedBooking._id),
        serviceType: createBookingDto.serviceType,
        dateTime: createBookingDto.dateTime,
      },
    });

    return savedBooking;
  }

  async findAll(
    userId: string,
    role?: 'owner' | 'provider',
  ): Promise<BookingDocument[]> {
    const query: any = {};

    if (role === 'owner') {
      query.owner = new Types.ObjectId(userId);
    } else if (role === 'provider') {
      query.provider = new Types.ObjectId(userId);
    } else {
      // Return all bookings where user is either owner or provider
      query.$or = [
        { owner: new Types.ObjectId(userId) },
        { provider: new Types.ObjectId(userId) },
      ];
    }

    const bookings = await this.bookingModel
      .find(query)
      .populate([
        { path: 'owner', select: 'name email profileImage' },
        { path: 'provider', select: 'name email profileImage' },
        { path: 'pet', select: 'name species breed' },
      ])
      .sort({ createdAt: -1 })
      .exec();

    return bookings;
  }

  async findOne(id: string, userId: string): Promise<BookingDocument> {
    const booking = await this.bookingModel
      .findById(id)
      .populate([
        { path: 'owner', select: 'name email profileImage' },
        { path: 'provider', select: 'name email profileImage' },
        { path: 'pet', select: 'name species breed' },
      ])
      .exec();

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Verify user has access to this booking
    // `owner` and `provider` are populated above, so compare their `_id`
    // values rather than stringifying the populated Mongoose documents.
    const ownerId = String((booking.owner as any)?._id ?? booking.owner);
    const providerId = String((booking.provider as any)?._id ?? booking.provider);
    if (ownerId !== userId && providerId !== userId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return booking;
  }

  async update(
    id: string,
    userId: string,
    updateBookingDto: UpdateBookingDto,
  ): Promise<BookingDocument> {
    const booking = await this.bookingModel.findById(id).exec();

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Verify user is the provider (only provider can accept/reject)
    const providerId = String(booking.provider);
    if (providerId !== userId) {
      throw new ForbiddenException(
        'Only the service provider can update booking status',
      );
    }

    // Update booking
    const updateData: any = { ...updateBookingDto };

    if (
      updateBookingDto.status === 'rejected' &&
      updateBookingDto.rejectionReason
    ) {
      updateData.rejectionReason = updateBookingDto.rejectionReason;
    }

    if (updateBookingDto.status === 'accepted') {
      // Create notification for owner
      await this.notificationsService.create({
        recipientId: String(booking.owner),
        senderId: userId,
        type: 'booking_accepted',
        title: 'Booking Accepted',
        message: `Your ${booking.serviceType} booking has been accepted.`,
        bookingId: id,
        metadata: {
          bookingId: id,
          serviceType: booking.serviceType,
          dateTime: booking.dateTime,
        },
      });
    } else if (updateBookingDto.status === 'rejected') {
      // Create notification for owner
      await this.notificationsService.create({
        recipientId: String(booking.owner),
        senderId: userId,
        type: 'booking_rejected',
        title: 'Booking Rejected',
        message: `Your ${booking.serviceType} booking has been rejected.`,
        bookingId: id,
        metadata: {
          bookingId: id,
          serviceType: booking.serviceType,
          rejectionReason: updateBookingDto.rejectionReason,
        },
      });
    }

    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .populate([
        { path: 'owner', select: 'name email profileImage' },
        { path: 'provider', select: 'name email profileImage' },
        { path: 'pet', select: 'name species breed' },
      ])
      .exec();

    return updatedBooking;
  }

  async remove(id: string, userId: string): Promise<void> {
    const booking = await this.bookingModel.findById(id).exec();

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Only owner or provider can cancel/delete
    const ownerId = String(booking.owner);
    const providerId = String(booking.provider);

    if (ownerId !== userId && providerId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to delete this booking',
      );
    }

    await this.bookingModel.findByIdAndDelete(id).exec();
  }
}
