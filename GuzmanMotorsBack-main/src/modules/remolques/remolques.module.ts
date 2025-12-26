import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RemolquesService } from './remolques.service';
import { RemolquesController } from './remolques.controller';
import { RemolquesPublicController } from './remolques-public.controller';
import { Remolque, RemolqueSchema } from './entities/remolque.entity';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Remolque.name, schema: RemolqueSchema },
    ]),
    CloudinaryModule,
  ],
  controllers: [RemolquesPublicController, RemolquesController],
  providers: [RemolquesService],
  exports: [RemolquesService],
})
export class RemolquesModule {}
