import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CloudinaryService } from './cloudinary.service';
import { UploadResponse } from './dto/media.dto';

@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class MediaController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('upload/image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponse> {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const result = await this.cloudinaryService.uploadImage(file);

    return {
      message: 'Imagen subida exitosamente',
      file: result,
    };
  }

  @Post('upload/video')
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponse> {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const result = await this.cloudinaryService.uploadVideo(file);

    return {
      message: 'Video subido exitosamente',
      file: result,
    };
  }

  @Delete(':publicId')
  async deleteMedia(@Param('publicId') publicId: string) {
    // Decodificar el publicId (viene codificado en URL)
    const decodedPublicId = decodeURIComponent(publicId);

    const result = await this.cloudinaryService.deleteMedia(decodedPublicId);

    return {
      message: result.success
        ? 'Archivo eliminado exitosamente'
        : 'No se pudo eliminar el archivo',
      success: result.success,
    };
  }

  @Get('info/:publicId')
  async getMediaInfo(@Param('publicId') publicId: string) {
    const decodedPublicId = decodeURIComponent(publicId);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const info: Record<string, unknown> =
      await this.cloudinaryService.getMediaInfo(decodedPublicId);

    return {
      message: 'Información del archivo obtenida exitosamente',
      info,
    };
  }

  @Get('stats')
  async getUsageStats() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const stats = await this.cloudinaryService.getUsageStats();

    return {
      message: 'Estadísticas de uso obtenidas exitosamente',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      stats,
    };
  }

  @Post('upload/multiple/images')
  @UseInterceptors(FilesInterceptor('files'))
  async uploadMultipleImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No se han proporcionado archivos');
    }

    const results = [];
    for (const file of files) {
      try {
        const result = await this.cloudinaryService.uploadImage(file);
        results.push({
          success: true,
          file: result,
        });
      } catch (error) {
        results.push({
          success: false,
          error: (error as Error).message,
          filename: 'error_file',
        });
      }
    }

    return {
      message: `Procesadas ${results.length} imágenes`,
      results,
      summary: {
        total: results.length,
        success: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    };
  }
}
