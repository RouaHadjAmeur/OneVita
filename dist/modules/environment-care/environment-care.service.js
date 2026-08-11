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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentCareService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const axios_1 = __importDefault(require("axios"));
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../users/schemas/user.schema");
const pet_schema_1 = require("../pets/schemas/pet.schema");
const human_health_profile_schema_1 = require("../human-health/schemas/human-health-profile.schema");
const cloudinary_service_1 = require("../cloudinary/cloudinary.service");
const environment_report_schema_1 = require("./schemas/environment-report.schema");
let EnvironmentCareService = class EnvironmentCareService {
    constructor(users, pets, humanProfiles, environmentReports, foodReports, cloudinary) {
        this.users = users;
        this.pets = pets;
        this.humanProfiles = humanProfiles;
        this.environmentReports = environmentReports;
        this.foodReports = foodReports;
        this.cloudinary = cloudinary;
    }
    async createReport(userId, body, media) {
        if (!media)
            throw new common_1.BadRequestException('A photo or video is required');
        const latitude = Number(body.latitude);
        const longitude = Number(body.longitude);
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new common_1.BadRequestException('Valid GPS coordinates are required');
        }
        const categories = ['illegal_waste', 'water_pollution', 'unsafe_drinking_water', 'unsafe_food', 'air_pollution', 'dead_animal', 'chemical_spill', 'burning_waste', 'oil_leakage', 'construction_waste', 'noise_pollution', 'other'];
        if (!categories.includes(body.category))
            throw new common_1.BadRequestException('Invalid report category');
        const description = String(body.description || '').trim();
        if (description.length < 10)
            throw new common_1.BadRequestException('Please provide a useful description');
        const isVideo = media.mimetype.startsWith('video/');
        let mediaUrl = '';
        let mediaUploadStatus = 'uploaded';
        try {
            const upload = isVideo
                ? await this.cloudinary.uploadAudio(media, 'environment-reports')
                : await this.cloudinary.uploadImage(media, 'environment-reports');
            mediaUrl = upload.secure_url;
        }
        catch (error) {
            mediaUploadStatus = 'pending';
            console.error('Environment report media upload deferred:', error);
        }
        const report = await this.environmentReports.create({
            reporter: userId,
            category: body.category,
            description,
            mediaUrl,
            mediaUploadStatus,
            mediaType: isVideo ? 'video' : 'image',
            latitude,
            longitude,
            severity: this.reportSeverity(body.category, description),
        });
        return this.publicReport(report.toObject());
    }
    async getReports(reporter) {
        const reports = await this.environmentReports
            .find(reporter ? { reporter } : {})
            .sort({ createdAt: -1 })
            .limit(250)
            .lean()
            .exec();
        return reports.map((report) => this.publicReport(report));
    }
    async updateReportStatus(role, id, body) {
        if (role !== 'admin')
            throw new common_1.ForbiddenException('Authority access required');
        if (!['under_review', 'confirmed', 'resolved', 'rejected'].includes(body.status)) {
            throw new common_1.BadRequestException('Invalid status');
        }
        const report = await this.environmentReports.findByIdAndUpdate(id, { status: body.status, authorityNote: String(body.authorityNote || '').slice(0, 1000) }, { new: true }).lean().exec();
        if (!report)
            throw new common_1.NotFoundException('Report not found');
        return this.publicReport(report);
    }
    async lookupProduct(rawBarcode) {
        const barcode = rawBarcode.replace(/\D/g, '');
        if (barcode.length < 8 || barcode.length > 14)
            throw new common_1.BadRequestException('Invalid barcode');
        const { data } = await axios_1.default.get(`https://world.openfoodfacts.org/api/v2/product/${barcode}`, {
            timeout: 10000,
            headers: { 'User-Agent': 'OneVita/1.0 (environment-care)' },
        });
        if (data?.status !== 1 || !data.product)
            throw new common_1.NotFoundException('Product not found');
        const p = data.product;
        return {
            barcode,
            name: p.product_name || p.product_name_en || 'Unnamed product',
            brands: p.brands || '',
            quantity: p.quantity || '',
            imageUrl: p.image_front_url || p.image_url || '',
            categories: p.categories || '',
            ingredients: p.ingredients_text || '',
            allergens: p.allergens_tags || [],
            nutritionGrade: p.nutrition_grades || null,
            novaGroup: p.nova_group || null,
            additives: p.additives_tags || [],
            origins: p.origins || '',
            manufacturingPlaces: p.manufacturing_places || '',
            stores: p.stores || '',
            countries: p.countries || '',
            labels: p.labels_tags || [],
            vegan: this.labelValue(p.ingredients_analysis_tags, 'vegan'),
            dataSource: 'Open Food Facts',
            disclaimer: 'Community-contributed data may be incomplete. Check the package label and official recalls.',
        };
    }
    async createFoodReport(userId, body, photo) {
        const issueTypes = ['strange_smell', 'expired', 'wrong_packaging', 'mold', 'foreign_object', 'fake_product', 'food_poisoning', 'other'];
        if (!issueTypes.includes(body.issueType))
            throw new common_1.BadRequestException('Invalid food issue type');
        const barcode = String(body.barcode || '').replace(/\D/g, '');
        if (barcode.length < 8 || barcode.length > 14)
            throw new common_1.BadRequestException('A valid barcode is required');
        const purchaseState = String(body.purchaseState || body.purchaseLocation || '').trim();
        if (purchaseState.length < 2)
            throw new common_1.BadRequestException('Purchase state or region is required');
        const description = String(body.description || '').trim();
        if (description.length < 10)
            throw new common_1.BadRequestException('Please describe the product issue');
        let photoUrl;
        if (photo)
            photoUrl = (await this.cloudinary.uploadImage(photo, 'food-safety-reports')).secure_url;
        const report = await this.foodReports.create({
            reporter: userId,
            barcode,
            productName: String(body.productName || ''),
            issueType: body.issueType,
            batchNumber: String(body.batchNumber || ''),
            purchaseState,
            purchaseLocation: purchaseState,
            description,
            symptoms: String(body.symptoms || ''),
            photoUrl,
        });
        return this.publicFoodReport(report.toObject());
    }
    async getFoodReports(rawBarcode) {
        const barcode = String(rawBarcode || '').replace(/\D/g, '');
        if (barcode.length < 8 || barcode.length > 14)
            throw new common_1.BadRequestException('A valid barcode is required');
        const reports = await this.foodReports
            .find({ barcode, status: { $ne: 'rejected' } })
            .sort({ createdAt: -1 })
            .limit(250)
            .lean()
            .exec();
        return reports.map((report) => this.publicFoodReport(report));
    }
    publicFoodReport(report) {
        return {
            id: String(report._id),
            barcode: report.barcode,
            productName: report.productName || '',
            issueType: report.issueType,
            batchNumber: report.batchNumber || '',
            purchaseState: report.purchaseState || report.purchaseLocation || '',
            description: report.description || '',
            symptoms: report.symptoms || '',
            photoUrl: report.photoUrl || '',
            status: report.status,
            createdAt: report.createdAt,
        };
    }
    publicReport(report) {
        return {
            id: String(report._id),
            category: report.category,
            description: report.description,
            mediaUrl: report.mediaUrl,
            mediaType: report.mediaType,
            latitude: Math.round(Number(report.latitude) * 1000) / 1000,
            longitude: Math.round(Number(report.longitude) * 1000) / 1000,
            status: report.status,
            severity: report.severity,
            authorityNote: report.authorityNote || null,
            createdAt: report.createdAt,
        };
    }
    reportSeverity(category, description) {
        if (['chemical_spill', 'oil_leakage', 'water_pollution', 'unsafe_drinking_water', 'unsafe_food'].includes(category))
            return 'high';
        if (/hospital|school|fire|explosion|poison|injur/i.test(description))
            return 'critical';
        if (['burning_waste', 'dead_animal'].includes(category))
            return 'high';
        return 'moderate';
    }
    labelValue(values, label) {
        if (!Array.isArray(values))
            return 'unknown';
        if (values.includes(`en:${label}`))
            return 'yes';
        if (values.includes(`en:non-${label}`))
            return 'no';
        return 'unknown';
    }
    async getDashboard(userId) {
        const [user, pets, human] = await Promise.all([
            this.users.findById(userId).lean().exec(),
            this.pets
                .find({ owner: userId })
                .populate('medicalHistory')
                .lean()
                .exec(),
            this.humanProfiles.findOne({ user: userId }).lean().exec(),
        ]);
        if (!user)
            throw new common_1.NotFoundException('User not found');
        const hasProfileLocation = Number.isFinite(user.latitude) && Number.isFinite(user.longitude);
        const latitude = this.roundCoordinate(hasProfileLocation ? Number(user.latitude) : 36.8065);
        const longitude = this.roundCoordinate(hasProfileLocation ? Number(user.longitude) : 10.1815);
        const [weatherResult, airResult] = await Promise.allSettled([
            this.fetchWeather(latitude, longitude),
            this.fetchAir(latitude, longitude),
        ]);
        const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
        const air = airResult.status === 'fulfilled' ? airResult.value : null;
        const conditions = this.buildConditions(weather, air);
        return {
            location: {
                city: user.city || 'Tunis',
                country: user.country || 'Tunisia',
                latitude,
                longitude,
                isProfileLocation: hasProfileLocation,
            },
            observedAt: new Date().toISOString(),
            conditions,
            environmentalScore: this.environmentalScore(conditions),
            alerts: this.buildAlerts(conditions, human, pets),
            recommendations: this.recommendations(conditions),
            advisories: [],
            dataSources: [
                ...(weather ? ['Open-Meteo Weather'] : []),
                ...(air ? ['CAMS ENSEMBLE air-quality data via Open-Meteo'] : []),
            ],
            limitations: [
                ...(!weather ? ['Live weather data is temporarily unavailable.'] : []),
                ...(!air ? ['Live air-quality data is temporarily unavailable.'] : []),
                'Water contamination and food recalls require an official local authority feed and are not inferred.',
                'Regional estimates may differ from nearby ground sensors.',
            ],
        };
    }
    roundCoordinate(value) {
        return Math.round(value * 100) / 100;
    }
    async fetchWeather(latitude, longitude) {
        const { data } = await axios_1.default.get('https://api.open-meteo.com/v1/forecast', {
            timeout: 10000,
            params: {
                latitude,
                longitude,
                current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m',
                daily: 'uv_index_max,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
                timezone: 'auto',
                forecast_days: 3,
            },
        });
        return data;
    }
    async fetchAir(latitude, longitude) {
        const { data } = await axios_1.default.get('https://air-quality-api.open-meteo.com/v1/air-quality', {
            timeout: 10000,
            params: {
                latitude,
                longitude,
                current: 'us_aqi,pm10,pm2_5,nitrogen_dioxide,ozone,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,ragweed_pollen',
                timezone: 'auto',
            },
        });
        return data;
    }
    buildConditions(weather, air) {
        const current = weather?.current || {};
        const daily = weather?.daily || {};
        const pollution = air?.current || {};
        const pollenValues = [
            pollution.alder_pollen,
            pollution.birch_pollen,
            pollution.grass_pollen,
            pollution.mugwort_pollen,
            pollution.ragweed_pollen,
        ]
            .map(Number)
            .filter(Number.isFinite);
        const pollen = pollenValues.length ? Math.max(...pollenValues) : null;
        const aqi = Number(pollution.us_aqi) || 0;
        return {
            temperature: Number(current.temperature_2m) || 0,
            apparentTemperature: Number(current.apparent_temperature) || 0,
            humidity: Number(current.relative_humidity_2m) || 0,
            windSpeed: Number(current.wind_speed_10m) || 0,
            weatherCode: Number(current.weather_code) || 0,
            uvIndex: Number(daily.uv_index_max?.[0]) || 0,
            precipitationProbability: Number(daily.precipitation_probability_max?.[0]) || 0,
            aqi,
            airQuality: this.aqiLabel(aqi),
            pm25: Number(pollution.pm2_5) || 0,
            pm10: Number(pollution.pm10) || 0,
            nitrogenDioxide: Number(pollution.nitrogen_dioxide) || 0,
            ozone: Number(pollution.ozone) || 0,
            pollen,
            pollenLevel: pollen == null
                ? 'Unavailable'
                : pollen < 10
                    ? 'Low'
                    : pollen < 50
                        ? 'Moderate'
                        : 'High',
        };
    }
    buildAlerts(conditions, human, pets) {
        const alerts = [];
        const humanText = JSON.stringify(human || {}).toLowerCase();
        const petText = JSON.stringify(pets || []).toLowerCase();
        const humanRespiratory = /asthma|respiratory|copd|bronch/.test(humanText);
        const petRespiratory = /asthma|respiratory|bronch/.test(petText);
        const allergic = /allerg|rhinitis|eczema/.test(`${humanText} ${petText}`);
        if (conditions.aqi > 100 ||
            (conditions.aqi > 50 && (humanRespiratory || petRespiratory))) {
            alerts.push({
                type: 'air_quality',
                severity: this.severity(conditions.aqi, 100, 150),
                title: 'Air quality precautions recommended',
                explanation: `Current AQI is ${conditions.aqi}.${humanRespiratory || petRespiratory ? ' A respiratory condition is recorded in your household.' : ''}`,
                humanRecommendation: 'Reduce strenuous outdoor activity and follow prescribed respiratory treatment.',
                petRecommendation: 'Shorten outdoor exercise and monitor coughing, wheezing, or unusual breathing.',
            });
        }
        if (conditions.apparentTemperature >= 32) {
            alerts.push({
                type: 'heat',
                severity: this.severity(conditions.apparentTemperature, 32, 40),
                title: 'Heat exposure risk',
                explanation: `It currently feels like ${conditions.apparentTemperature}°C.`,
                humanRecommendation: 'Hydrate regularly and avoid strenuous activity during the hottest hours.',
                petRecommendation: 'Provide shade and water, avoid hot pavement, and never leave a pet in a parked vehicle.',
            });
        }
        if (conditions.uvIndex >= 6) {
            alerts.push({
                type: 'uv',
                severity: this.severity(conditions.uvIndex, 6, 8),
                title: 'High UV exposure',
                explanation: `Today’s maximum UV index is ${conditions.uvIndex}.`,
                humanRecommendation: 'Use shade, protective clothing, and broad-spectrum sunscreen.',
                petRecommendation: 'Limit prolonged midday exposure for hairless or light-coated pets.',
            });
        }
        if (conditions.pollenLevel === 'High' ||
            (conditions.pollenLevel === 'Moderate' && allergic)) {
            alerts.push({
                type: 'pollen',
                severity: conditions.pollenLevel === 'High' ? 'high' : 'moderate',
                title: 'Pollen and allergen precautions',
                explanation: `Regional pollen is ${String(conditions.pollenLevel).toLowerCase()}.${allergic ? ' Allergy sensitivity is recorded in your household.' : ''}`,
                humanRecommendation: 'Keep windows closed during peaks and rinse after outdoor exposure.',
                petRecommendation: 'Wipe paws and coat after walks and monitor itching or eye irritation.',
            });
        }
        if (conditions.temperature >= 20 &&
            conditions.humidity >= 60) {
            alerts.push({
                type: 'vector',
                severity: 'moderate',
                title: 'Mosquito and tick prevention',
                explanation: 'Warm, humid conditions can support increased mosquito and tick activity; this is a conditions-based precaution, not a live vector count.',
                humanRecommendation: 'Use appropriate repellent, remove standing water, and check skin after outdoor activity.',
                petRecommendation: 'Keep veterinarian-recommended parasite prevention current and check the coat after walks.',
            });
        }
        if (conditions.windSpeed >= 60 ||
            conditions.precipitationProbability >= 80) {
            alerts.push({
                type: 'weather_hazard',
                severity: conditions.windSpeed >= 80 ? 'high' : 'moderate',
                title: 'Potential severe weather precautions',
                explanation: `Wind is ${conditions.windSpeed} km/h and today’s maximum precipitation probability is ${conditions.precipitationProbability}%.`,
                humanRecommendation: 'Check official local warnings before travel and secure loose outdoor objects.',
                petRecommendation: 'Keep pets supervised indoors and prepare identification, food, water, and medication.',
            });
        }
        return alerts;
    }
    recommendations(conditions) {
        const result = [
            'Check local conditions before extended outdoor activity.',
        ];
        result.push(conditions.humidity < 30
            ? 'Protect skin and airways from very dry conditions and conserve water.'
            : 'Carry reusable water containers for people and pets outdoors.');
        result.push('Reduce household waste by reusing containers and sorting recyclable materials locally.');
        return result;
    }
    environmentalScore(conditions) {
        let score = 100;
        score -= Math.min(45, Math.max(0, conditions.aqi - 25) * 0.35);
        if (conditions.uvIndex > 5)
            score -= Math.min(20, (conditions.uvIndex - 5) * 4);
        if (conditions.apparentTemperature > 30)
            score -= Math.min(20, (conditions.apparentTemperature - 30) * 2);
        score -=
            conditions.pollenLevel === 'High'
                ? 15
                : conditions.pollenLevel === 'Moderate'
                    ? 7
                    : 0;
        return Math.max(0, Math.round(score));
    }
    severity(value, moderateAt, highAt) {
        if (value >= highAt)
            return 'high';
        if (value >= moderateAt)
            return 'moderate';
        return 'low';
    }
    aqiLabel(aqi) {
        if (aqi <= 50)
            return 'Good';
        if (aqi <= 100)
            return 'Moderate';
        if (aqi <= 150)
            return 'Unhealthy for sensitive groups';
        if (aqi <= 200)
            return 'Unhealthy';
        if (aqi <= 300)
            return 'Very unhealthy';
        return 'Hazardous';
    }
};
exports.EnvironmentCareService = EnvironmentCareService;
exports.EnvironmentCareService = EnvironmentCareService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(pet_schema_1.Pet.name)),
    __param(2, (0, mongoose_1.InjectModel)(human_health_profile_schema_1.HumanHealthProfile.name)),
    __param(3, (0, mongoose_1.InjectModel)(environment_report_schema_1.EnvironmentReport.name)),
    __param(4, (0, mongoose_1.InjectModel)(environment_report_schema_1.FoodSafetyReport.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        cloudinary_service_1.CloudinaryService])
], EnvironmentCareService);
//# sourceMappingURL=environment-care.service.js.map