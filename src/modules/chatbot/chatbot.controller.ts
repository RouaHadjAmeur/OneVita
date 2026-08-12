// src/modules/chatbot/chatbot.controller.ts

import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/schemas/user.schema';
import { ChatbotService } from './chatbot.service';
import { ChatbotMessageDto } from './dto/chatbot-message.dto';
import { ChatbotImageAnalysisDto } from './dto/chatbot-image-analysis.dto';
import { ChatbotResponseDto } from './dto/chatbot-response.dto';
import { ChatbotHistoryResponseDto } from './dto/chatbot-history-response.dto';

@ApiTags('chatbot')
@Controller('chatbot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('message')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Send a text message to the chatbot (with optional image)',
    description:
      'Get an AI-powered response to a text message. Can include an image for analysis. The chatbot has access to your pet information and conversation history for context.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'User message text',
          example: 'What should I feed my dog?',
        },
        image: {
          type: 'string',
          format: 'binary',
          description: 'Optional image file to analyze along with the message',
        },
        context: {
          type: 'string',
          description: 'Optional conversation context',
        },
        mode: {
          type: 'string',
          enum: ['global', 'pet', 'human', 'environment'],
          description: 'Care mode; global can route across all OneVita modules',
        },
      },
      required: ['message'],
    },
  })
  async sendMessage(
    @CurrentUser() user: User,
    @Body() body: ChatbotMessageDto & { image?: string },
    @UploadedFile() imageFile?: Express.Multer.File,
  ): Promise<ChatbotResponseDto> {
    const userId = String(user._id ?? user.id);

    // Handle image from file upload or base64 in body
    let imageBase64: string | undefined;

    if (imageFile) {
      // Convert file buffer to base64
      imageBase64 = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;
    } else if (body?.image && typeof body.image === 'string') {
      // Image provided as base64 string in body
      imageBase64 = body.image;
    }

    // Create message DTO with optional image
    const messageDto: ChatbotMessageDto & { image?: string } = {
      message: body.message,
      context: body.context,
      mode: body.mode ?? 'global',
      ...(imageBase64 && { image: imageBase64 }),
    };

    return this.chatbotService.processMessage(userId, messageDto);
  }

  @Post('analyze-image')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Analyze a pet image',
    description:
      'Upload an image and get AI-powered analysis of pet health, appearance, and recommendations.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file to analyze',
        },
        prompt: {
          type: 'string',
          description: 'Optional prompt/question about the image',
          example: 'What health issues do you see?',
        },
      },
    },
  })
  async analyzeImage(
    @CurrentUser() user: User,
    @Body() body: { prompt?: string; image?: string },
    @UploadedFile() imageFile?: Express.Multer.File,
  ): Promise<ChatbotResponseDto> {
    const userId = String(user._id ?? user.id);

    // Handle image from file upload or base64 in body
    let imageBase64: string;

    if (imageFile) {
      // Convert file buffer to base64
      imageBase64 = `data:${imageFile.mimetype};base64,${imageFile.buffer.toString('base64')}`;
    } else if (body?.image && typeof body.image === 'string') {
      // Image provided as base64 string in body
      imageBase64 = body.image;
    } else {
      throw new BadRequestException(
        'Image is required. Provide either a file upload (multipart/form-data) or base64 string in body.',
      );
    }

    const imageAnalysisDto: ChatbotImageAnalysisDto = {
      image: imageBase64,
      prompt: body?.prompt,
    };

    return this.chatbotService.analyzeImage(userId, imageAnalysisDto);
  }

  @Post('analyze-image-base64')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Analyze a pet image from base64 string',
    description:
      'Send an image as base64 and get AI-powered analysis. Alternative to multipart upload.',
  })
  async analyzeImageBase64(
    @CurrentUser() user: User,
    @Body() imageAnalysisDto: ChatbotImageAnalysisDto,
  ): Promise<ChatbotResponseDto> {
    const userId = String(user._id ?? user.id);
    return this.chatbotService.analyzeImage(userId, imageAnalysisDto);
  }

  @Get('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get conversation history',
    description:
      'Retrieve the conversation history for the current user. Messages are returned in chronological order.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of messages to return (default: 50)',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Number of messages to skip (for pagination, default: 0)',
    example: 0,
  })
  async getHistory(
    @CurrentUser() user: User,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<ChatbotHistoryResponseDto> {
    const userId = String(user._id ?? user.id);
    return this.chatbotService.getHistory(userId, limit, offset);
  }

  @Delete('history')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear conversation history',
    description:
      'Delete all conversation history for the current user. This action cannot be undone.',
  })
  async clearHistory(@CurrentUser() user: User): Promise<{ message: string }> {
    const userId = String(user._id ?? user.id);
    return this.chatbotService.clearHistory(userId);
  }
}
