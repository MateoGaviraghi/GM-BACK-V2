import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NovedadesController } from './novedades.controller';
import { NovedadesService } from './novedades.service';
import { Novedad, NovedadSchema } from './entities/novedad.entity';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';
import { NovedadesPublicController } from './novedades-public.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Novedad.name, schema: NovedadSchema }]),
    CloudinaryModule,
  ],
  controllers: [NovedadesPublicController, NovedadesController], // ✅ Público PRIMERO
  providers: [NovedadesService],
  exports: [NovedadesService],
})
export class NovedadesModule {}
