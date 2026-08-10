"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const booking_schema_1 = require("./schemas/booking.schema");
const pet_schema_1 = require("../pets/schemas/pet.schema");
const user_schema_1 = require("../users/schemas/user.schema");
const notifications_service_1 = require("../notifications/notifications.service");
let BookingsService = class BookingsService {
    constructor(bookingModel, petModel, userModel, notificationsService) {
        this.bookingModel = bookingModel;
        this.petModel = petModel;
        this.userModel = userModel;
        this.notificationsService = notificationsService;
    }
    async isActiveProvider(userId) {
        const user = await this.userModel
            .findById(userId)
            .select('role hasActiveSubscription')
            .lean()
            .exec();
        return Boolean(user?.hasActiveSubscription &&
            (user.role === 'vet' || user.role === 'sitter'));
    }
    async assertActiveProvider(userId) {
        if (!(await this.isActiveProvider(userId))) {
            throw new common_1.ForbiddenException('An active veterinarian or pet sitter subscription is required');
        }
    }
    async create(userId, createBookingDto) {
        if (!createBookingDto.petId) {
            throw new common_1.ForbiddenException('A pet must be selected for this booking');
        }
        const selectedPet = await this.petModel
            .findOne({
            _id: new mongoose_2.Types.ObjectId(createBookingDto.petId),
            owner: new mongoose_2.Types.ObjectId(userId),
        })
            .select('_id')
            .exec();
        if (!selectedPet) {
            throw new common_1.ForbiddenException('The selected pet does not belong to this account');
        }
        const provider = await this.userModel
            .findOne({
            _id: new mongoose_2.Types.ObjectId(createBookingDto.providerId),
            role: createBookingDto.providerType,
            hasActiveSubscription: true,
        })
            .select('_id')
            .lean()
            .exec();
        if (!provider) {
            throw new common_1.ForbiddenException('The selected care provider is no longer available');
        }
        const booking = new this.bookingModel({
            owner: new mongoose_2.Types.ObjectId(userId),
            provider: new mongoose_2.Types.ObjectId(createBookingDto.providerId),
            providerType: createBookingDto.providerType,
            pet: createBookingDto.petId
                ? new mongoose_2.Types.ObjectId(createBookingDto.petId)
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
    async findAll(userId, role) {
        const query = {};
        if (role === 'owner') {
            query.owner = new mongoose_2.Types.ObjectId(userId);
        }
        else if (role === 'provider') {
            await this.assertActiveProvider(userId);
            query.provider = new mongoose_2.Types.ObjectId(userId);
        }
        else {
            const activeProvider = await this.isActiveProvider(userId);
            query.$or = activeProvider
                ? [
                    { owner: new mongoose_2.Types.ObjectId(userId) },
                    { provider: new mongoose_2.Types.ObjectId(userId) },
                ]
                : [{ owner: new mongoose_2.Types.ObjectId(userId) }];
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
    async findOne(id, userId) {
        const booking = await this.bookingModel.findById(id).exec();
        if (!booking) {
            throw new common_1.NotFoundException(`Booking with ID ${id} not found`);
        }
        const ownerId = String(booking.owner);
        const providerId = String(booking.provider);
        if (ownerId !== userId && providerId !== userId) {
            throw new common_1.ForbiddenException('You do not have access to this booking');
        }
        if (providerId === userId && ownerId !== userId) {
            await this.assertActiveProvider(userId);
        }
        const canSeeFullPet = ownerId === userId ||
            (providerId === userId && booking.providerType === 'vet');
        await booking.populate([
            { path: 'owner', select: 'name email profileImage' },
            { path: 'provider', select: 'name email profileImage' },
            canSeeFullPet
                ? {
                    path: 'pet',
                    select: 'name species breed age gender color weight height photo microchipId medicalHistory',
                    populate: { path: 'medicalHistory' },
                }
                : { path: 'pet', select: 'name species breed' },
        ]);
        return booking;
    }
    async update(id, userId, updateBookingDto) {
        const booking = await this.bookingModel.findById(id).exec();
        if (!booking) {
            throw new common_1.NotFoundException(`Booking with ID ${id} not found`);
        }
        const providerId = String(booking.provider);
        if (providerId !== userId) {
            throw new common_1.ForbiddenException('Only the service provider can update booking status');
        }
        await this.assertActiveProvider(userId);
        if (updateBookingDto.status &&
            ['accepted', 'rejected'].includes(updateBookingDto.status) &&
            booking.status !== 'pending') {
            throw new common_1.ForbiddenException('Only pending bookings can be accepted or rejected');
        }
        if (updateBookingDto.status === 'completed' &&
            booking.status !== 'accepted') {
            throw new common_1.ForbiddenException('Only accepted bookings can be marked completed');
        }
        const updateData = { ...updateBookingDto };
        if (updateBookingDto.dateTime) {
            updateData.dateTime = new Date(updateBookingDto.dateTime);
            await this.notificationsService.create({
                recipientId: String(booking.owner),
                senderId: userId,
                type: 'booking_rescheduled',
                title: 'New Appointment Time Suggested',
                message: `A new time was suggested for your ${booking.serviceType} booking.`,
                bookingId: id,
                metadata: {
                    bookingId: id,
                    serviceType: booking.serviceType,
                    dateTime: updateBookingDto.dateTime,
                },
            });
        }
        if (updateBookingDto.status === 'rejected' &&
            updateBookingDto.rejectionReason) {
            updateData.rejectionReason = updateBookingDto.rejectionReason;
        }
        if (updateBookingDto.status === 'accepted') {
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
        }
        else if (updateBookingDto.status === 'rejected') {
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
        else if (updateBookingDto.status === 'completed') {
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
    async remove(id, userId) {
        const booking = await this.bookingModel.findById(id).exec();
        if (!booking) {
            throw new common_1.NotFoundException(`Booking with ID ${id} not found`);
        }
        const ownerId = String(booking.owner);
        const providerId = String(booking.provider);
        if (ownerId !== userId && providerId !== userId) {
            throw new common_1.ForbiddenException('You do not have permission to delete this booking');
        }
        if (providerId === userId && ownerId !== userId) {
            await this.assertActiveProvider(userId);
        }
        await this.bookingModel.findByIdAndDelete(id).exec();
    }
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(booking_schema_1.Booking.name)),
    __param(1, (0, mongoose_1.InjectModel)(pet_schema_1.Pet.name)),
    __param(2, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        notifications_service_1.NotificationsService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map