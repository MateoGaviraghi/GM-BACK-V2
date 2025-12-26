import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Vehiculos0kmService } from './vehiculos0km.service';
import { Vehiculos0kmController } from './vehiculos0km.controller';
import { Vehiculos0kmPublicController } from './vehiculos0km-public.controller';
import {
  Vehiculos0km,
  Vehiculos0kmSchema,
} from './entities/vehiculos0km.entity';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vehiculos0km.name, schema: Vehiculos0kmSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [Vehiculos0kmPublicController, Vehiculos0kmController],
  providers: [Vehiculos0kmService],
  exports: [Vehiculos0kmService],
})
export class Vehiculos0kmModule {}
