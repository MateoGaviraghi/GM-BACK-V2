import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { AuthModule } from './auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { Vehiculos0kmModule } from './modules/vehiculos0km/vehiculos0km.module';
import { RemolquesModule } from './modules/remolques/remolques.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { UsadosModule } from './modules/usados/usados.module';
import { NovedadesModule } from './modules/novedades/novedades.module';
import { envValidationSchema } from './config/env.validation';

@Module({
  imports: [
    // Configuración global con validación de variables de entorno
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true, // Permite otras variables no definidas
        abortEarly: false, // Muestra todos los errores de validación
      },
    }),

    // Rate Limiting global
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000, // 1 segundo
        limit: 10, // 10 requests por segundo
      },
      {
        name: 'medium',
        ttl: 60000, // 1 minuto
        limit: 100, // 100 requests por minuto
      },
      {
        name: 'long',
        ttl: 900000, // 15 minutos
        limit: 1000, // 1000 requests por 15 minutos
      },
    ]),

    // Connect to MongoDB using Mongoose
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>(
          'MONGODB_URI',
          'mongodb://localhost:27017/GuzmanMotorsBack',
        ),
      }),
    }),

    CloudinaryModule,
    HealthModule,
    ClientesModule,
    AuthModule,
    UsuariosModule,
    Vehiculos0kmModule,
    RemolquesModule,
    UsadosModule,
    NovedadesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Aplicar ThrottlerGuard globalmente
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
