import { Global, Module } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import { MediaController } from './media.controller';

@Global()
@Module({
  controllers: [MediaController],
  providers: [CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}
