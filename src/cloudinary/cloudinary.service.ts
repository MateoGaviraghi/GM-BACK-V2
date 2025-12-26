import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly configService: ConfigService) {
    const cloudinaryUrl = this.configService.get<string>('CLOUDINARY_URL');
    if (cloudinaryUrl) {
      // Si existe CLOUDINARY_URL, configurar usando la URL completa
      process.env.CLOUDINARY_URL = cloudinaryUrl;

      // También configurar manualmente para asegurar que funcione
      // Parsear la URL: cloudinary://api_key:api_secret@cloud_name
      const url = new URL(cloudinaryUrl);

      const config = {
        cloud_name: url.hostname,
        api_key: url.username,
        api_secret: url.password,
      };

      cloudinary.config(config);
    } else {
      // Fallback a configuración manual si no hay CLOUDINARY_URL
      const config = {
        cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
        api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
        api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      };

      cloudinary.config(config);
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'vehiculos0km/images',
  ): Promise<{
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
    thumbnails: {
      small: string;
      medium: string;
      large: string;
    };
  }> {
    try {
      // Type assertion para evitar errores de tipo
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const uploadFile = file as any;

      // Validar que el archivo existe y tiene las propiedades necesarias
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (!uploadFile || !uploadFile.mimetype || !uploadFile.size) {
        throw new BadRequestException('Archivo inválido');
      }

      // Validar que sea una imagen
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      if (!uploadFile.mimetype.startsWith('image/')) {
        throw new BadRequestException('El archivo debe ser una imagen');
      }

      // Validar tamaño máximo (5MB)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (uploadFile.size > 5 * 1024 * 1024) {
        throw new BadRequestException(
          'La imagen no puede superar los 5MB de tamaño',
        );
      }

      // Subir imagen original
      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: folder,
              transformation: [
                { quality: 'auto' },
                { fetch_format: 'auto' },
                { width: 1920, height: 1080, crop: 'limit' },
              ],
              resource_type: 'image',
            },
            (
              error: UploadApiErrorResponse | undefined,
              result: UploadApiResponse | undefined,
            ) => {
              if (error)
                reject(new Error(error.message || 'Error uploading image'));
              else resolve(result!);
            },
          )
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          .end(uploadFile.buffer);
      });

      // Generar URLs de diferentes tamaños
      const thumbnails = {
        small: cloudinary.url(result.public_id, {
          width: 300,
          height: 200,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto',
        }),
        medium: cloudinary.url(result.public_id, {
          width: 600,
          height: 400,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto',
        }),
        large: cloudinary.url(result.public_id, {
          width: 1200,
          height: 800,
          crop: 'fill',
          quality: 'auto',
          fetch_format: 'auto',
        }),
      };

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        thumbnails,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Error al subir la imagen: ' + (error as Error).message ||
          'Error desconocido',
      );
    }
  }

  async uploadVideo(
    file: Express.Multer.File,
    folder: string = 'vehiculos0km/videos',
  ): Promise<{
    public_id: string;
    secure_url: string;
    duration: number;
    width: number;
    height: number;
    format: string;
    bytes: number;
    thumbnail: string;
  }> {
    try {
      // Type assertion para evitar errores de tipo
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const uploadFile = file as any;

      // Validar que sea un video
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      if (!uploadFile.mimetype.startsWith('video/')) {
        throw new BadRequestException('El archivo debe ser un video');
      }

      // Validar tamaño máximo (50MB)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (uploadFile.size > 50 * 1024 * 1024) {
        throw new BadRequestException(
          'El video no puede superar los 50MB de tamaño',
        );
      }

      // Subir video
      const result: UploadApiResponse = await new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: folder,
              resource_type: 'video',
              transformation: [
                { quality: 'auto' },
                { width: 1280, height: 720, crop: 'limit' },
              ],
            },
            (
              error: UploadApiErrorResponse | undefined,
              result: UploadApiResponse | undefined,
            ) => {
              if (error)
                reject(new Error(error.message || 'Error uploading video'));
              else resolve(result!);
            },
          )
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          .end(uploadFile.buffer);
      });

      // Generar thumbnail del video
      const thumbnail = cloudinary.url(result.public_id, {
        resource_type: 'video',
        format: 'jpg',
        transformation: [
          { width: 600, height: 400, crop: 'fill' },
          { start_offset: '10%' }, // Frame al 10% del video
        ],
      });

      return {
        public_id: result.public_id,
        secure_url: result.secure_url,
        duration: (result.duration as number) || 0,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        thumbnail,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Error al subir el video: ' + (error as Error).message ||
          'Error desconocido',
      );
    }
  }

  async deleteMedia(publicId: string): Promise<{ success: boolean }> {
    try {
      // Intentar eliminar como imagen primero
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      let result: any = await cloudinary.uploader.destroy(publicId);

      // Si no se encontró como imagen, intentar como video
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      if (result.result === 'not found') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        result = await cloudinary.uploader.destroy(publicId, {
          resource_type: 'video',
        });
      }

      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        success: result.result === 'ok',
      };
    } catch (error) {
      throw new BadRequestException(
        'Error al eliminar el archivo: ' + (error as Error).message,
      );
    }
  }

  async getMediaInfo(publicId: string): Promise<any> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result: any = await cloudinary.api.resource(publicId);
      return result;
    } catch {
      // Intentar como video si no se encuentra como imagen
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const result: any = await cloudinary.api.resource(publicId, {
          resource_type: 'video',
        });
        return result;
      } catch {
        throw new BadRequestException('Archivo no encontrado');
      }
    }
  }

  // Método para generar URLs firmadas (más seguras)
  generateSignedUrl(
    publicId: string,
    transformation?: Record<string, any>,
    resourceType: 'image' | 'video' = 'image',
  ): string {
    return cloudinary.url(publicId, {
      ...(transformation || {}),
      resource_type: resourceType,
      sign_url: true,
      secure: true,
    });
  }

  // Método para obtener estadísticas de uso
  async getUsageStats(): Promise<any> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result: any = await cloudinary.api.usage();
      return {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        credits: result.credits || 0,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        used_percent: result.used_percent || 0,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        limit: result.limit || 0,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        transformations: result.transformations || 0,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        storage: result.storage || 0,
      };
    } catch (error) {
      throw new BadRequestException(
        'Error al obtener estadísticas: ' + (error as Error).message,
      );
    }
  }
}
