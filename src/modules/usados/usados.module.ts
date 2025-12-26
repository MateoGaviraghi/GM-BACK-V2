import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsadosService } from './usados.service';
import { UsadosController } from './usados.controller';
import { UsadosPublicController } from './usados-public.controller';
import { Usado, UsadoSchema } from './entities/usado.entity';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Usado.name, schema: UsadoSchema }]),
    CloudinaryModule,
  ],
  controllers: [UsadosPublicController, UsadosController],
  providers: [UsadosService],
  exports: [UsadosService],
})
export class UsadosModule {}
