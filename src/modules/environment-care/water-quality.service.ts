import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import axios from 'axios';
import { Model } from 'mongoose';
import { EnvironmentReport, EnvironmentReportDocument } from './schemas/environment-report.schema';

type WaterStatus = 'NORMAL' | 'MODERATE' | 'WARNING' | 'HIGH_RISK';

@Injectable()
export class WaterQualityService {
  private readonly collectionId = 'c320caa8-4d97-40e1-90c6-e34dd5e42b8b';
  private token?: { value: string; expiresAt: number };

  constructor(
    @InjectModel(EnvironmentReport.name)
    private readonly reports: Model<EnvironmentReportDocument>,
  ) {}

  async getConditions(latitude: number, longitude: number) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new BadRequestException('Valid lat and lng coordinates are required');
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

  private async accessToken() {
    if (this.token && this.token.expiresAt > Date.now() + 60_000) return this.token.value;
    const clientId = process.env.COPERNICUS_CLIENT_ID;
    const clientSecret = process.env.COPERNICUS_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new ServiceUnavailableException('Copernicus Data Space credentials are not configured');
    const body = new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret });
    const { data } = await axios.post(
      'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token',
      body.toString(),
      { timeout: 15_000, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    if (!data?.access_token) throw new BadGatewayException('Copernicus authentication returned no token');
    this.token = { value: data.access_token, expiresAt: Date.now() + Number(data.expires_in || 600) * 1000 };
    return this.token.value;
  }

  private async fetchCopernicus(latitude: number, longitude: number) {
    const token = await this.accessToken();
    // Aggregate valid lake/reservoir pixels in an approximately 15 km search
    // area. Land pixels are excluded by the product dataMask.
    const delta = 0.135;
    const to = new Date();
    const from = new Date(to.getTime() - 70 * 86_400_000);
    const evalscript = `//VERSION=3
function setup(){return{input:["TMEAN","CHLAMEAN","TSMMEAN","TSI","FCBPROB","NOBS","dataMask"],output:[{id:"turbidity",bands:1,sampleType:"FLOAT32"},{id:"chlorophyllA",bands:1,sampleType:"FLOAT32"},{id:"suspendedMatter",bands:1,sampleType:"FLOAT32"},{id:"trophicStateIndex",bands:1,sampleType:"FLOAT32"},{id:"cyanobacteriaProbability",bands:1,sampleType:"FLOAT32"},{id:"observations",bands:1,sampleType:"FLOAT32"},{id:"dataMask",bands:1}]};}
function evaluatePixel(s){return{turbidity:[s.TMEAN],chlorophyllA:[s.CHLAMEAN],suspendedMatter:[s.TSMMEAN],trophicStateIndex:[s.TSI],cyanobacteriaProbability:[s.FCBPROB],observations:[s.NOBS],dataMask:[s.dataMask]};}`;
    try {
      const { data } = await axios.post('https://sh.dataspace.copernicus.eu/api/v1/statistics', {
        input: {
          bounds: { geometry: { type: 'Polygon', coordinates: [[[longitude-delta,latitude-delta],[longitude+delta,latitude-delta],[longitude+delta,latitude+delta],[longitude-delta,latitude+delta],[longitude-delta,latitude-delta]]] }, properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' } },
          data: [{ type: `byoc-${this.collectionId}`, dataFilter: { mosaickingOrder: 'mostRecent' } }],
        },
        aggregation: { timeRange: { from: from.toISOString(), to: to.toISOString() }, aggregationInterval: { of: 'P10D' }, evalscript, resx: 100, resy: 100 },
      }, { timeout: 30_000, headers: { Authorization: `Bearer ${token}` } });
      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const detail = error.response?.data?.error?.message || error.message;
        throw new BadGatewayException(`Copernicus water-quality request failed: ${detail}`);
      }
      throw error;
    }
  }

  private latestIndicators(payload: any) {
    const rows = Array.isArray(payload?.data) ? [...payload.data].reverse() : [];
    for (const row of rows) {
      const mean = (name: string) => {
        const bands = row?.outputs?.[name]?.bands || {};
        const firstBand = bands.B0 ?? Object.values(bands)[0];
        const number = Number((firstBand as any)?.stats?.mean);
        return Number.isFinite(number) ? Math.round(number * 100) / 100 : null;
      };
      const observations = mean('observations');
      if (observations == null || observations <= 0) continue;
      return { observationDate: row.interval?.to || row.interval?.from, values: {
        turbidity: this.indicator('Turbidity', mean('turbidity'), 'NTU'),
        chlorophyllA: this.indicator('Chlorophyll-a', mean('chlorophyllA'), 'mg/m³'),
        suspendedMatter: this.indicator('Total suspended matter', mean('suspendedMatter'), 'g/m³'),
        trophicStateIndex: this.indicator('Trophic state index', mean('trophicStateIndex'), 'index'),
        cyanobacteriaProbability: this.indicator('Floating cyanobacteria probability', mean('cyanobacteriaProbability'), 'probability'),
        waterClarity: this.indicator('Water clarity', null, 'm'),
        validObservations: this.indicator('Valid satellite observations', observations, 'count'),
      }};
    }
    return null;
  }

  private indicator(name: string, value: number | null, unit: string) {
    return { name, value, unit, available: value != null };
  }

  private status(values: any): WaterStatus {
    const number = (key: string) => Number(values[key]?.value);
    const [tur, chl, tsi, cya] = [number('turbidity'), number('chlorophyllA'), number('trophicStateIndex'), number('cyanobacteriaProbability')];
    if (cya >= .75 || tsi >= 70 || tur >= 50 || chl >= 50) return 'HIGH_RISK';
    if (cya >= .5 || tsi >= 60 || tur >= 25 || chl >= 30) return 'WARNING';
    if (cya >= .25 || tsi >= 50 || tur >= 10 || chl >= 10) return 'MODERATE';
    return 'NORMAL';
  }

  private async nearbyCitizenReports(latitude: number, longitude: number) {
    const delta = .15;
    const rows = await this.reports.find({ category: { $in: ['water_pollution', 'unsafe_drinking_water'] }, status: { $ne: 'rejected' }, latitude: { $gte: latitude-delta, $lte: latitude+delta }, longitude: { $gte: longitude-delta, $lte: longitude+delta } }).sort({ createdAt: -1 }).limit(20).lean();
    return rows.map((report: any) => ({ id: String(report._id), category: report.category, status: report.status, severity: report.severity, latitude: report.latitude, longitude: report.longitude, address: report.address || '', mediaUrl: report.mediaUrl || '', createdAt: report.createdAt }));
  }
}
