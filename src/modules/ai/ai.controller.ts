// src/modules/ai/ai.controller.ts
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { AiTipsResponseDto } from './dto/ai-tips-response.dto';
import { AiRecommendationsResponseDto } from './dto/ai-recommendations-response.dto';
import { AiRemindersResponseDto } from './dto/ai-reminders-response.dto';
import { AiStatusResponseDto } from './dto/ai-status-response.dto';
import { AiHealthReportResponseDto } from './dto/ai-health-report-response.dto';

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('pets/:petId/report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate a complete AI health report for a pet' })
  @ApiParam({ name: 'petId', description: 'Pet ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully generated health report',
    type: AiHealthReportResponseDto,
  })
  async getHealthReport(
    @Param('petId') petId: string,
    @Query('refresh') refresh?: string,
  ): Promise<AiHealthReportResponseDto> {
    return this.aiService.generateHealthReport(petId, refresh === 'true');
  }

  @Get('pets/:petId/tips')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI-generated tips for a pet' })
  @ApiParam({ name: 'petId', description: 'Pet ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully generated tips',
    type: AiTipsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Pet not found' })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async getTips(@Param('petId') petId: string): Promise<AiTipsResponseDto> {
    try {
      return await this.aiService.generateTips(petId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not configured')) {
        throw new HttpException(
          'AI service is temporarily unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      // Handle daily quota exhaustion - different from rate limits
      if (
        error instanceof Error &&
        error.message.includes('AI_DAILY_QUOTA_EXCEEDED')
      ) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message:
              'AI daily quota exceeded. Please try again tomorrow or contact support.',
            code: 'AI_DAILY_QUOTA_EXCEEDED',
            retryAfter: 86400, // 24 hours
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }

      // Handle rate limit errors (per-minute throttling)
      if (
        error instanceof Error &&
        (error.message.includes('Rate limit') || error.message.includes('429'))
      ) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message:
              'AI service is rate limited. Please try again in a minute.',
            code: 'AI_RATE_LIMITED',
            retryAfter: 60,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw error;
    }
  }

  @Get('pets/:petId/recommendations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI-generated recommendations for a pet' })
  @ApiParam({ name: 'petId', description: 'Pet ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully generated recommendations',
    type: AiRecommendationsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Pet not found' })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async getRecommendations(
    @Param('petId') petId: string,
  ): Promise<AiRecommendationsResponseDto> {
    try {
      return await this.aiService.generateRecommendations(petId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not configured')) {
        throw new HttpException(
          'AI service is temporarily unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      if (
        error instanceof Error &&
        (error.message.includes('Rate limit') || error.message.includes('429'))
      ) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message:
              'AI service is rate limited. Please try again in a minute.',
            retryAfter: 60,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw error;
    }
  }

  @Get('pets/:petId/reminders')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI-generated reminders for a pet' })
  @ApiParam({ name: 'petId', description: 'Pet ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully generated reminders',
    type: AiRemindersResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Pet not found' })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async getReminders(
    @Param('petId') petId: string,
  ): Promise<AiRemindersResponseDto> {
    try {
      return await this.aiService.generateReminders(petId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not configured')) {
        throw new HttpException(
          'AI service is temporarily unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      if (
        error instanceof Error &&
        (error.message.includes('Rate limit') || error.message.includes('429'))
      ) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message:
              'AI service is rate limited. Please try again in a minute.',
            retryAfter: 60,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw error;
    }
  }

  @Get('pets/:petId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get AI-generated health status for a pet' })
  @ApiParam({ name: 'petId', description: 'Pet ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully generated status',
    type: AiStatusResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Pet not found' })
  @ApiResponse({ status: 503, description: 'AI service unavailable' })
  async getStatus(@Param('petId') petId: string): Promise<AiStatusResponseDto> {
    try {
      return await this.aiService.generateStatus(petId);
    } catch (error) {
      if (error instanceof Error && error.message.includes('not configured')) {
        throw new HttpException(
          'AI service is temporarily unavailable',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      if (
        error instanceof Error &&
        (error.message.includes('Rate limit') || error.message.includes('429'))
      ) {
        throw new HttpException(
          {
            statusCode: HttpStatus.SERVICE_UNAVAILABLE,
            message:
              'AI service is rate limited. Please try again in a minute.',
            retryAfter: 60,
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      }
      throw error;
    }
  }
}
