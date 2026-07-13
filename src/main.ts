import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as express from 'express';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    rawBody: true, // Enable raw body for webhook signature verification
  });

  // Increase JSON body size limit to 10 MB to support base64-encoded pet photos.
  // A 1 MB JPEG becomes ~1.37 MB in base64; 10 MB gives comfortable headroom.
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

  app.enableCors();
  app.useWebSocketAdapter(new IoAdapter(app));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Step 1: Build Swagger configuration
  const swaggerConfig = new DocumentBuilder()
    .setTitle('OneVita Backend API')
    .setDescription('API documentation for OneVita backend')
    .setVersion('1.0')
    .addBearerAuth()
    .build() as OpenAPIObject;

  const swaggerDocument: OpenAPIObject = SwaggerModule.createDocument(
    app,
    swaggerConfig,
  );

  // Step 3: Setup Swagger
  SwaggerModule.setup('api', app, swaggerDocument);
  const port = Number(process.env.PORT) || 3000;
  const host = '0.0.0.0';
  await app.listen(port, host);

  Logger.log(`Server listening on ${host}:${port}`);
}

bootstrap().catch((err: unknown) => {
  if (err instanceof Error) {
    Logger.error('Error starting server', err.message, err.stack);
  } else {
    Logger.error('Unknown error starting server', JSON.stringify(err));
  }
});
