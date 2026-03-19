import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger:
      process.env.NODE_ENV === 'production'
        ? ['error', 'warn']
        : ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  const config = app.get(ConfigService);

  // Seguridad HTTP con Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      crossOriginEmbedderPolicy: false, // Para Cloudinary
    }),
  );

  // Validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS configurado de forma segura
  const frontendUrl =
    config.get<string>('FRONTEND_URL') || 'http://localhost:3001';
  const corsOrigins = config.get<string>('CORS_ORIGINS');
  const nodeEnv = config.get<string>('NODE_ENV') || 'development';

  // Construir lista de orígenes permitidos
  const allowedOrigins: string[] = [frontendUrl];
  if (corsOrigins) {
    allowedOrigins.push(
      ...corsOrigins.split(',').map((origin) => origin.trim()),
    );
  }

  app.enableCors({
    origin: nodeEnv === 'production' ? allowedOrigins : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600, // Cache preflight por 1 hora
  });

  // Prefijo global para la API
  app.setGlobalPrefix('api');

  const port = Number(config.get('PORT', 3000));
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Servidor corriendo en http://localhost:${port}/api`);
  console.log(`🔒 Modo: ${nodeEnv}`);
  console.log(
    `🌍 CORS habilitado para: ${nodeEnv === 'production' ? allowedOrigins.join(', ') : 'Todos los orígenes (dev)'}`,
  );
}
void bootstrap();
