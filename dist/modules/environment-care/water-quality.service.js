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
exports.WaterQualityService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const axios_1 = __importDefault(require("axios"));
const mongoose_2 = require("mongoose");
const environment_report_schema_1 = require("./schemas/environment-report.schema");
let WaterQualityService = class WaterQualityService {
    constructor(reports) {
        this.reports = reports;
        this.collectionId = 'c320caa8-4d97-40e1-90c6-e34dd5e42b8b';
    }
    async getConditions(latitude, longitude) {
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
            throw new common_1.BadRequestException('Valid lat and lng coordinates are required');
        }
        const [payload, citizenReports] = await Promise.all([
            this.fetchCopernicus(latitude, longitude),
            this.nearbyCitizenReports(latitude, longitude),
        ]);
        const latest = this.latestIndicators(payload);
        return {
            requestedLocation: { latitude, longitude },
            waterBodies: latest ? [{
                    id: `copernicus:${latitude.toFixed(4)}:${longitude.toFixed(4)}`,
                    name: 'Nearby monitored inland waters (15 km area)',
                    latitude,
                    longitude,
                    observationDate: latest.observationDate,
                    source: {
                        provider: 'Copernicus Land Monitoring Service',
                        product: 'Lake Water Quality 100 m, 10-daily, Version 2',
                        collectionId: this.collectionId,
                        resolutionMeters: 100,
                    },
                    status: this.status(latest.values),
                    statusMethod: 'OneVita screening thresholds applied to Copernicus satellite indicators',
                    indicators: latest.values,
                    limitations: [
                        'Satellite-derived environmental indicators are not certified drinking-water test results.',
                        'Cloud, ice, shoreline mixing and limited valid pixels can reduce observation quality.',
                    ],
                }] : [],
            citizenReports,
            officialMonitoring: [],
            disclaimer: 'OneVita does not label water safe or unsafe to drink from satellite data. Follow official Tunisian laboratory and public-health advisories.',
            generatedAt: new Date().toISOString(),
        };
    }
    async accessToken() {
        if (this.token && this.token.expiresAt > Date.now() + 60_000)
            return this.token.value;
        const clientId = process.env.COPERNICUS_CLIENT_ID;
        const clientSecret = process.env.COPERNICUS_CLIENT_SECRET;
        if (!clientId || !clientSecret)
            throw new common_1.ServiceUnavailableException('Copernicus Data Space credentials are not configured');
        const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret });
        const { data } = await axios_1.default.post('https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token', body.toString(), { timeout: 15_000, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
        if (!data?.access_token)
            throw new common_1.BadGatewayException('Copernicus authentication returned no token');
        this.token = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 600) * 1000 };
        return this.token.value;
    }
    async fetchCopernicus(latitude, longitude) {
        const token = await this.accessToken();
        const delta = 0.135;
        const to = new Date();
        const from = new Date(to.getTime() - 70 * 86_400_000);
        const evalscript = `//VERSION=3
function setup(){return{input:["TMEAN","CHLAMEAN","TSMMEAN","TSI","FCBPROB","NOBS","dataMask"],output:[{id:"turbidity",bands:1,sampleType:"FLOAT32"},{id:"chlorophyllA",bands:1,sampleType:"FLOAT32"},{id:"suspendedMatter",bands:1,sampleType:"FLOAT32"},{id:"trophicStateIndex",bands:1,sampleType:"FLOAT32"},{id:"cyanobacteriaProbability",bands:1,sampleType:"FLOAT32"},{id:"observations",bands:1,sampleType:"FLOAT32"},{id:"dataMask",bands:1}]};}
function evaluatePixel(s){return{turbidity:[s.TMEAN],chlorophyllA:[s.CHLAMEAN],suspendedMatter:[s.TSMMEAN],trophicStateIndex:[s.TSI],cyanobacteriaProbability:[s.FCBPROB],observations:[s.NOBS],dataMask:[s.dataMask]};}`;
        try {
            const { data } = await axios_1.default.post('https://sh.dataspace.copernicus.eu/api/v1/statistics', {
                input: {
                    bounds: { geometry: { type: 'Polygon', coordinates: [[[longitude - delta, latitude - delta], [longitude + delta, latitude - delta], [longitude + delta, latitude + delta], [longitude - delta, latitude + delta], [longitude - delta, latitude - delta]]] }, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
                    data: [{ type: `byoc-${this.collectionId}`, dataFilter: { mosaickingOrder: 'mostRecent' } }],
                },
                aggregation: { timeRange: { from: from.toISOString(), to: to.toISOString() }, aggregationInterval: { of: 'P10D' }, evalscript, resx: 0.0009, resy: 0.0009 },
            }, { timeout: 30_000, headers: { Authorization: `Bearer ${token}` } });
            return data;
        }
        catch (error) {
            if (axios_1.default.isAxiosError(error)) {
                const detail = error.response?.data?.error?.message || error.message;
                throw new common_1.BadGatewayException(`Copernicus water-quality request failed: ${detail}`);
            }
            throw error;
        }
    }
    latestIndicators(payload) {
        const rows = Array.isArray(payload?.data) ? [...payload.data].reverse() : [];
        for (const row of rows) {
            const mean = (name) => {
                const bands = row?.outputs?.[name]?.bands || {};
                const firstBand = bands.B0 ?? Object.values(bands)[0];
                const number = Number(firstBand?.stats?.mean);
                return Number.isFinite(number) ? Math.round(number * 100) / 100 : null;
            };
            const observations = mean('observations');
            if (observations == null || observations <= 0)
                continue;
            return { observationDate: row.interval?.to || row.interval?.from, values: {
                    turbidity: this.indicator('Turbidity', mean('turbidity'), 'NTU'),
                    chlorophyllA: this.indicator('Chlorophyll-a', mean('chlorophyllA'), 'mg/m³'),
                    suspendedMatter: this.indicator('Total suspended matter', mean('suspendedMatter'), 'g/m³'),
                    trophicStateIndex: this.indicator('Trophic state index', mean('trophicStateIndex'), 'index'),
                    cyanobacteriaProbability: this.indicator('Floating cyanobacteria probability', mean('cyanobacteriaProbability'), 'probability'),
                    waterClarity: this.indicator('Water clarity', null, 'm'),
                    validObservations: this.indicator('Valid satellite observations', observations, 'count'),
                } };
        }
        return null;
    }
    indicator(name, value, unit) {
        return { name, value, unit, available: value != null };
    }
    status(values) {
        const number = (key) => Number(values[key]?.value);
        const [tur, chl, tsi, cya] = [number('turbidity'), number('chlorophyllA'), number('trophicStateIndex'), number('cyanobacteriaProbability')];
        if (cya >= .75 || tsi >= 70 || tur >= 50 || chl >= 50)
            return 'HIGH_RISK';
        if (cya >= .5 || tsi >= 60 || tur >= 25 || chl >= 30)
            return 'WARNING';
        if (cya >= .25 || tsi >= 50 || tur >= 10 || chl >= 10)
            return 'MODERATE';
        return 'NORMAL';
    }
    async nearbyCitizenReports(latitude, longitude) {
        const delta = .15;
        const rows = await this.reports.find({ category: { $in: ['water_pollution', 'unsafe_drinking_water'] }, status: { $ne: 'rejected' }, latitude: { $gte: latitude - delta, $lte: latitude + delta }, longitude: { $gte: longitude - delta, $lte: longitude + delta } }).sort({ createdAt: -1 }).limit(20).lean();
        return rows.map((report) => ({ id: String(report._id), category: report.category, status: report.status, severity: report.severity, latitude: report.latitude, longitude: report.longitude, address: report.address || '', mediaUrl: report.mediaUrl || '', createdAt: report.createdAt }));
    }
};
exports.WaterQualityService = WaterQualityService;
exports.WaterQualityService = WaterQualityService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(environment_report_schema_1.EnvironmentReport.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], WaterQualityService);
//# sourceMappingURL=water-quality.service.js.map