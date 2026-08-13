import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Booking, BookingDocument } from './schemas/booking.schema';
import { Pet, PetDocument } from '../pets/schemas/pet.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { NotificationsService } from '../notifications/notifications.service';
import {
  PetSitter,
  PetSitterDocument,
} from '../pet-sitters/schemas/pet-sitter.schema';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name)
    private readonly bookingModel: Model<BookingDocument>,
    @InjectModel(Pet.name)
    private readonly petModel: Model<PetDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(PetSitter.name)
    private readonly petSitterModel: Model<PetSitterDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async isActiveProvider(userId: string): Promise<boolean> {
    const user = await this.userModel
      .findById(userId)
      .select('role hasActiveSubscription')
      .lean()
      .exec();
    return Boolean(
      user?.hasActiveSubscription &&
        (user.role === 'vet' || user.role === 'sitter'),
    );
  }

  private async assertActiveProvider(userId: string): Promise<void> {
    if (!(await this.isActiveProvider(userId))) {
      throw new ForbiddenException(
        'An active veterinarian or pet sitter subscription is required',
      );
    }
  }

  async create(
    userId: string,
    createBookingDto: CreateBookingDto,
  ): Promise<BookingDocument> {
    if (!createBookingDto.petId) {
      throw new ForbiddenException('A pet must be selected for this booking');
    }
    const selectedPet = await this.petModel
      .findOne({
        _id: new Types.ObjectId(createBookingDto.petId),
        owner: new Types.ObjectId(userId),
      })
      .select('_id')
      .exec();
    if (!selectedPet) {
      throw new ForbiddenException(
        'The selected pet does not belong to this account',
      );
    }

    const provider = await this.userModel
      .findOne({
        _id: new Types.ObjectId(createBookingDto.providerId),
        role: createBookingDto.providerType,
        hasActiveSubscription: true,
      })
      .select('_id')
      .lean()
      .exec();
    if (!provider) {
      throw new ForbiddenException(
        'The selected care provider is no longer available',
      );
    }

    const dateTime = new Date(createBookingDto.dateTime);
    const duration = Math.max(
      30,
      Math.min(createBookingDto.duration ?? 60, 1440),
    );
    let price = createBookingDto.price;
    let paymentStatus = 'not_required';

    if (createBookingDto.providerType === 'sitter') {
      const sitter = await this.petSitterModel
        .findOne({ user: new Types.ObjectId(createBookingDto.providerId) })
        .lean();
      if (!sitter) throw new NotFoundException('Pet sitter profile not found');
      const localHour = dateTime.getUTCHours();
      const weekend = dateTime.getUTCDay() === 0 || dateTime.getUTCDay() === 6;
      const startHour = sitter.workdayStartHour ?? 8;
      const endHour = sitter.workdayEndHour ?? 18;
      const endDate = new Date(dateTime.getTime() + duration * 60000);
      if (weekend && !sitter.availableWeekends) {
        throw new BadRequestException(
          'This sitter is not available on weekends',
        );
      }
      if (localHour < startHour || endDate.getUTCHours() > endHour) {
        throw new BadRequestException(
          `Select a time within the sitter working hours (${startHour}:00–${endHour}:00)`,
        );
      }
      price = Number(((sitter.hourlyRate * duration) / 60).toFixed(2));
      paymentStatus = 'unpaid';

      const end = new Date(dateTime.getTime() + duration * 60000);
      const nearbyBookings = await this.bookingModel
        .find({
          provider: new Types.ObjectId(createBookingDto.providerId),
          status: { $in: ['accepted', 'reschedule_pending'] },
          dateTime: {
            $lt: end,
            $gte: new Date(dateTime.getTime() - 1440 * 60000),
          },
        })
        .select('dateTime duration')
        .lean();
      const conflicts = nearbyBookings.some((item) => {
        const existingStart = new Date(item.dateTime).getTime();
        const existingEnd =
          existingStart + Math.max(item.duration ?? 60, 30) * 60000;
        return (
          dateTime.getTime() < existingEnd && end.getTime() > existingStart
        );
      });
      if (conflicts) {
        throw new BadRequestException(
          'This sitter already has an appointment near the selected time',
        );
      }
    }

    const booking = new this.bookingModel({
      owner: new Types.ObjectId(userId),
      provider: new Types.ObjectId(createBookingDto.providerId),
      providerType: createBookingDto.providerType,
      pet: createBookingDto.petId
        ? new Types.ObjectId(createBookingDto.petId)
        : undefined,
      serviceType: createBookingDto.serviceType,
      description: createBookingDto.description,
      dateTime,
      duration,
      price,
      paymentStatus,
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
      await this.assertActiveProvider(userId);
      query.provider = new Types.ObjectId(userId);
    } else {
      const activeProvider = await this.isActiveProvider(userId);
      query.$or = activeProvider
        ? [
            { owner: new Types.ObjectId(userId) },
            { provider: new Types.ObjectId(userId) },
          ]
        : [{ owner: new Types.ObjectId(userId) }];
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
    const booking = await this.bookingModel.findById(id).exec();

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    const ownerId = String(booking.owner);
    const providerId = String(booking.provider);
    if (ownerId !== userId && providerId !== userId) {
      throw new ForbiddenException('You do not have access to this booking');
    }
    if (providerId === userId && ownerId !== userId) {
      await this.assertActiveProvider(userId);
    }

    const canSeeFullPet =
      ownerId === userId ||
      (providerId === userId && booking.providerType === 'vet');

    await booking.populate([
      { path: 'owner', select: 'name email profileImage' },
      { path: 'provider', select: 'name email profileImage' },
      canSeeFullPet
        ? {
            path: 'pet',
            select:
              'name species breed age gender color weight height photo microchipId medicalHistory',
            populate: { path: 'medicalHistory' },
          }
        : { path: 'pet', select: 'name species breed' },
    ]);

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

    const ownerId = String(booking.owner);
    const providerId = String(booking.provider);

    // The owner alone accepts or declines a time proposed by the provider.
    if (ownerId === userId && booking.status === 'reschedule_pending') {
      if (!['accepted', 'rejected'].includes(updateBookingDto.status ?? '')) {
        throw new ForbiddenException(
          'The owner can only accept or decline the proposed appointment time',
        );
      }
      const accepted = updateBookingDto.status === 'accepted';
      const updated = await this.bookingModel
        .findByIdAndUpdate(
          id,
          {
            $set: {
              status: updateBookingDto.status,
              ownerRespondedAt: new Date(),
              ...(updateBookingDto.rejectionReason
                ? { rejectionReason: updateBookingDto.rejectionReason }
                : {}),
            },
          },
          { new: true },
        )
        .populate([
          { path: 'owner', select: 'name email profileImage' },
          { path: 'provider', select: 'name email profileImage' },
          { path: 'pet', select: 'name species breed' },
        ])
        .exec();
      await this.notificationsService.create({
        recipientId: providerId,
        senderId: userId,
        type: accepted
          ? 'booking_reschedule_accepted'
          : 'booking_reschedule_declined',
        title: accepted ? 'New Time Accepted' : 'New Time Declined',
        message: accepted
          ? `The pet owner accepted the proposed time for ${booking.serviceType}.`
          : `The pet owner declined the proposed time for ${booking.serviceType}.`,
        bookingId: id,
        metadata: {
          bookingId: id,
          serviceType: booking.serviceType,
          dateTime: booking.dateTime,
        },
      });
      return updated;
    }

    if (providerId !== userId) {
      throw new ForbiddenException(
        'Only the assigned provider can update this booking',
      );
    }
    await this.assertActiveProvider(userId);

    // Only pending requests can be accepted or rejected. Accepted
    // appointments can later be marked completed by the provider.
    if (
      updateBookingDto.status &&
      ['accepted', 'rejected'].includes(updateBookingDto.status) &&
      booking.status !== 'pending'
    ) {
      throw new ForbiddenException(
        'Only pending bookings can be accepted or rejected',
      );
    }
    if (
      updateBookingDto.status === 'completed' &&
      booking.status !== 'accepted'
    ) {
      throw new ForbiddenException(
        'Only accepted bookings can be marked completed',
      );
    }

    // Update booking status and/or the provider's appointment note.
    const updateData: any = { ...updateBookingDto };

    if (updateBookingDto.dateTime) {
      updateData.dateTime = new Date(updateBookingDto.dateTime);
      updateData.status = 'reschedule_pending';
      updateData.rescheduleProposedAt = new Date();
      updateData.ownerRespondedAt = null;
      await this.notificationsService.create({
        recipientId: String(booking.owner),
        senderId: userId,
        type: 'booking_rescheduled',
        title: 'Confirm New Appointment Time',
        message: `Your provider suggested a new time for ${booking.serviceType}. Open the appointment to accept or decline it.`,
        bookingId: id,
        metadata: {
          bookingId: id,
          serviceType: booking.serviceType,
          dateTime: updateBookingDto.dateTime,
        },
      });
    }

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
    } else if (updateBookingDto.status === 'completed') {
      updateData.completedAt = new Date();
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
    if (providerId === userId && ownerId !== userId) {
      await this.assertActiveProvider(userId);
    }

    await this.bookingModel.findByIdAndDelete(id).exec();
  }
}
