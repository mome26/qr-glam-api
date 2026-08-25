import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { useContainer } from 'class-validator';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as express from 'express';
import { join } from 'path';
import * as fs from 'fs';
import { AppModule } from './app.module';
import { validateEnv } from './config/env.validation';

import * as dotenv from 'dotenv';
dotenv.config();

// Ensure critical environment variables (BASE_URL) are set before startup
validateEnv();

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Enable dependency injection for class-validator (T088)
    useContainer(app.select(AppModule), { fallbackOnErrors: true });

    // Configure Handlebars view engine for QR scan pages (T083)
    let viewsDir = join(__dirname, 'qr-codes', 'templates');

    // If template doesn't exist here (common in dist/src structure), try relative to dist root
    if (!fs.existsSync(join(viewsDir, 'qr-scan-page.hbs'))) {
        const distRootViewsDir = join(__dirname, '..', 'qr-codes', 'templates');
        if (fs.existsSync(join(distRootViewsDir, 'qr-scan-page.hbs'))) {
            viewsDir = distRootViewsDir;
        }
    }

    console.log(`[SSR] Setting views directory to: ${viewsDir}`);
    app.setViewEngine('hbs');
    app.setBaseViewsDir(viewsDir);

    // Set global API prefix — exclude health check and public QR scan endpoint
    app.setGlobalPrefix('api', {
        exclude: ['health', 'e/:eventId/qr/:qrId'],
    });

    // Enable CORS
    app.enableCors();

    // Serve static files from public folder (symlinked to qr-glam-fe-v2/dist)
    app.use(express.static(join(process.cwd(), 'public')));

    // Increase payload size limit to 10MB for image uploads
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb' }));

    // Global validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    // Swagger configuration
    const config = new DocumentBuilder()
        .setTitle('QR Glam API')
        .setDescription('API for managing QR codes with stylized designs')
        .setVersion('1.0')
        .addBearerAuth()
        .addTag('Auth', 'Authentication endpoints')
        .addTag('Users', 'User management endpoints')
        .addTag('Events', 'Event management endpoints')
        .addTag('Guests', 'Guest management endpoints')
        .addTag('QR Codes', 'QR code management endpoints')
        .addTag('QR Templates', 'QR template management endpoints')
        .addTag('Media Provider', 'Media provider configuration endpoints')
        .addTag('Redirects', 'Public QR redirect and scan endpoints')
        .addTag('Health', 'Health check endpoints')
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            docExpansion: 'list',
            filter: true,
            showRequestHeaders: true,
        },
    });

    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';
    await app.listen(port, host);
    console.log(
        `Application is running on: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`,
    );
    console.log(
        `API documentation available at: http://${host === '0.0.0.0' ? 'localhost' : host}:${port}/api/docs`,
    );
}

bootstrap();
