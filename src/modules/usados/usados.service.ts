import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type FilterQuery, type Model } from 'mongoose';
import NodeCache from 'node-cache';
import { CreateUsadoDto } from './dto/create-usado.dto';
import { UpdateUsadoDto } from './dto/update-usado.dto';
import { ChangeStatusUsadoDto } from './dto/change-status-usado.dto';
import { Usado, UsadoDocument } from './entities/usado.entity';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { MediaFile } from '../../cloudinary';

@Injectable()
export class UsadosService {
  private optionsCache: NodeCache;

  constructor(
    @InjectModel(Usado.name)
    private readonly usadoModel: Model<UsadoDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {
    this.optionsCache = new NodeCache({ stdTTL: 1800, checkperiod: 600 });
  }

  async create(createUsadoDto: CreateUsadoDto) {
    try {
      const usado = await this.usadoModel.create(createUsadoDto);
      this.clearOptionsCache();
      return usado;
    } catch {
      throw new InternalServerErrorException(
        'Error al crear el vehículo usado',
      );
    }
  }

  async createWithMedia(
    createUsadoDto: CreateUsadoDto,
    files: {
      imagenes?: Express.Multer.File[];
      videos?: Express.Multer.File[];
      fotoSinFondo1?: Express.Multer.File[];
      fotoSinFondo2?: Express.Multer.File[];
    },
  ) {
    const uploadedImages: MediaFile[] = [];
    const uploadedVideos: MediaFile[] = [];
    let uploadedFotoSinFondo1: MediaFile | undefined;
    let uploadedFotoSinFondo2: MediaFile | undefined;

    try {
      if (files.imagenes && files.imagenes.length > 0) {
        for (const imageFile of files.imagenes) {
          try {
            const uploadedImage = await this.cloudinaryService.uploadImage(
              imageFile,
              'usados/images',
            );
            uploadedImages.push(uploadedImage);
          } catch (error) {
            throw new BadRequestException(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              `Error al subir imagen: ${error.message || 'Error desconocido'}`,
            );
          }
        }
      }

      if (files.videos && files.videos.length > 0) {
        for (const videoFile of files.videos) {
          try {
            const uploadedVideo = await this.cloudinaryService.uploadVideo(
              videoFile,
              'usados/videos',
            );
            uploadedVideos.push(uploadedVideo);
          } catch (error) {
            await this.cleanupUploadedFiles(uploadedImages, []);
            throw new BadRequestException(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              `Error al subir video: ${error.message || 'Error desconocido'}`,
            );
          }
        }
      }

      if (files.fotoSinFondo1 && files.fotoSinFondo1.length > 0) {
        try {
          uploadedFotoSinFondo1 = await this.cloudinaryService.uploadImage(
            files.fotoSinFondo1[0],
            'usados/fotos-sin-fondo',
          );
        } catch (error) {
          await this.cleanupUploadedFiles(uploadedImages, uploadedVideos);
          throw new BadRequestException(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            `Error al subir fotoSinFondo1: ${error.message || 'Error desconocido'}`,
          );
        }
      }

      if (files.fotoSinFondo2 && files.fotoSinFondo2.length > 0) {
        try {
          uploadedFotoSinFondo2 = await this.cloudinaryService.uploadImage(
            files.fotoSinFondo2[0],
            'usados/fotos-sin-fondo',
          );
        } catch (error) {
          await this.cleanupUploadedFiles(uploadedImages, uploadedVideos);
          if (uploadedFotoSinFondo1) {
            await this.cloudinaryService
              .deleteMedia(uploadedFotoSinFondo1.public_id)
              .catch(() => {});
          }
          throw new BadRequestException(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            `Error al subir fotoSinFondo2: ${error.message || 'Error desconocido'}`,
          );
        }
      }

      const usadoData = {
        ...createUsadoDto,
        estado: createUsadoDto.estado || 'Disponible',
        imagenes: uploadedImages,
        videos: uploadedVideos,
        fotoSinFondo1: uploadedFotoSinFondo1,
        fotoSinFondo2: uploadedFotoSinFondo2,
      };

      const usado = await this.usadoModel.create(usadoData);
      this.clearOptionsCache();
      return usado;
    } catch (error) {
      await this.cleanupUploadedFiles(uploadedImages, uploadedVideos);
      if (uploadedFotoSinFondo1) {
        await this.cloudinaryService
          .deleteMedia(uploadedFotoSinFondo1.public_id)
          .catch(() => {});
      }
      if (uploadedFotoSinFondo2) {
        await this.cloudinaryService
          .deleteMedia(uploadedFotoSinFondo2.public_id)
          .catch(() => {});
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Error al crear vehículo usado: ${error.message || 'Error desconocido'}`,
      );
    }
  }

  private async cleanupUploadedFiles(
    images: MediaFile[],
    videos: MediaFile[],
  ): Promise<void> {
    const cleanupPromises: Promise<unknown>[] = [];
    for (const image of images) {
      cleanupPromises.push(
        this.cloudinaryService.deleteMedia(image.public_id).catch(() => {}),
      );
    }
    for (const video of videos) {
      cleanupPromises.push(
        this.cloudinaryService.deleteMedia(video.public_id).catch(() => {}),
      );
    }
    await Promise.allSettled(cleanupPromises);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    sortBy?: keyof Usado | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
    filters?: {
      marca?: string;
      modelo?: string;
      estado?: string;
      tipos?: string;
      tipoCombustible?: string;
      transmisiones?: string;
      tracciones?: string;
    };
    ranges?: {
      kilometrajeMin?: number;
      kilometrajeMax?: number;
      anioFrom?: string;
      anioTo?: string;
    };
  }): Promise<{
    items: UsadoDocument[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      filters = {},
      ranges = {},
    } = params;

    const query = this.usadoModel.find();
    query.where('estado').ne('Vendido');

    if (filters.marca) {
      query.where('marca').regex(new RegExp(filters.marca, 'i'));
    }
    if (filters.modelo) {
      query.where('modelo').regex(new RegExp(filters.modelo, 'i'));
    }
    if (filters.estado) {
      query.where('estado').equals(filters.estado);
    }
    if (filters.tipos) {
      query.where('tipos').regex(new RegExp(filters.tipos, 'i'));
    }
    if (filters.tipoCombustible) {
      query
        .where('tipoCombustible')
        .regex(new RegExp(filters.tipoCombustible, 'i'));
    }
    if (filters.transmisiones) {
      query
        .where('transmisiones')
        .regex(new RegExp(filters.transmisiones, 'i'));
    }
    if (filters.tracciones) {
      query.where('tracciones').regex(new RegExp(filters.tracciones, 'i'));
    }

    if (ranges.kilometrajeMin !== undefined) {
      query.where('kilometraje').gte(ranges.kilometrajeMin);
    }
    if (ranges.kilometrajeMax !== undefined) {
      query.where('kilometraje').lte(ranges.kilometrajeMax);
    }
    if (ranges.anioFrom) {
      query.where('anio').gte(new Date(ranges.anioFrom).getTime());
    }
    if (ranges.anioTo) {
      query.where('anio').lte(new Date(ranges.anioTo).getTime());
    }

    const skip = Math.max(0, (page - 1) * limit);
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    if (sortBy !== ('_id' as any)) {
      sort['_id'] = sortOrder === 'asc' ? 1 : -1;
    }

    const listQuery = query
      .clone()
      .sort(sort)
      .skip(skip)
      .limit(Math.min(limit, 100));
    const countQuery = query.clone().countDocuments();

    const items = (await listQuery.exec()) as UsadoDocument[];
    const total = await countQuery.exec();

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string) {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de vehículo usado inválido');
      }

      const usado = await this.usadoModel
        .findById(id)
        .populate('imagenes')
        .populate('videos')
        .populate('fotoSinFondo1')
        .populate('fotoSinFondo2')
        .exec();
      if (!usado) {
        throw new NotFoundException(
          `Vehículo usado con ID ${id} no encontrado`,
        );
      }

      return usado;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al buscar el vehículo usado',
      );
    }
  }

  async update(id: string, updateUsadoDto: UpdateUsadoDto) {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de vehículo usado inválido');
      }

      const updatedUsado = await this.usadoModel
        .findByIdAndUpdate(id, updateUsadoDto, {
          new: true,
          runValidators: true,
        })
        .exec();

      if (!updatedUsado) {
        throw new NotFoundException(
          `Vehículo usado con ID ${id} no encontrado`,
        );
      }

      this.clearOptionsCache();
      return updatedUsado;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al actualizar el vehículo usado',
      );
    }
  }

  async updateWithMedia(
    id: string,
    updateUsadoDto: UpdateUsadoDto,
    files: {
      imagenes?: Express.Multer.File[];
      videos?: Express.Multer.File[];
      fotoSinFondo1?: Express.Multer.File[];
      fotoSinFondo2?: Express.Multer.File[];
    },
  ) {
    const uploadedImages: MediaFile[] = [];
    const uploadedVideos: MediaFile[] = [];
    let uploadedFotoSinFondo1: MediaFile | undefined;
    let uploadedFotoSinFondo2: MediaFile | undefined;

    try {
      // 1. Validar ID
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de vehículo usado inválido');
      }

      // 2. Obtener el vehículo actual
      const usado = await this.usadoModel.findById(id).exec();
      if (!usado) {
        throw new NotFoundException(
          `Vehículo usado con ID ${id} no encontrado`,
        );
      }

      // 3. Eliminar imágenes marcadas para eliminar
      if (
        Array.isArray(updateUsadoDto.imagenesAEliminar) &&
        updateUsadoDto.imagenesAEliminar.length > 0
      ) {
        for (const publicId of updateUsadoDto.imagenesAEliminar) {
          try {
            await this.cloudinaryService.deleteMedia(publicId);
          } catch (error) {
            console.error(`Error al eliminar imagen ${publicId}:`, error);
          }
        }
        usado.imagenes = (usado.imagenes || []).filter(
          (img) => !updateUsadoDto.imagenesAEliminar?.includes(img.public_id),
        );
      }

      // 4. Eliminar videos marcados para eliminar
      if (
        Array.isArray(updateUsadoDto.videosAEliminar) &&
        updateUsadoDto.videosAEliminar.length > 0
      ) {
        for (const publicId of updateUsadoDto.videosAEliminar) {
          try {
            await this.cloudinaryService.deleteMedia(publicId);
          } catch (error) {
            console.error(`Error al eliminar video ${publicId}:`, error);
          }
        }
        usado.videos = (usado.videos || []).filter(
          (vid) => !updateUsadoDto.videosAEliminar?.includes(vid.public_id),
        );
      }

      // 5. Eliminar fotoSinFondo1 si se marcó
      if (updateUsadoDto.eliminarFotoSinFondo1 && usado.fotoSinFondo1) {
        try {
          await this.cloudinaryService.deleteMedia(
            usado.fotoSinFondo1.public_id,
          );
          usado.fotoSinFondo1 = undefined;
        } catch (error) {
          console.error('Error al eliminar fotoSinFondo1:', error);
        }
      }

      // 6. Eliminar fotoSinFondo2 si se marcó
      if (updateUsadoDto.eliminarFotoSinFondo2 && usado.fotoSinFondo2) {
        try {
          await this.cloudinaryService.deleteMedia(
            usado.fotoSinFondo2.public_id,
          );
          usado.fotoSinFondo2 = undefined;
        } catch (error) {
          console.error('Error al eliminar fotoSinFondo2:', error);
        }
      }

      // 7. Subir nuevas imágenes
      if (files.imagenes && files.imagenes.length > 0) {
        for (const imageFile of files.imagenes) {
          try {
            const uploadedImage = await this.cloudinaryService.uploadImage(
              imageFile,
              'usados/images',
            );
            uploadedImages.push(uploadedImage);
          } catch (error) {
            await this.cleanupUploadedFiles(uploadedImages, []);
            throw new BadRequestException(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              `Error al subir imagen: ${error.message || 'Error desconocido'}`,
            );
          }
        }
        usado.imagenes = [...(usado.imagenes || []), ...uploadedImages];
      }

      // 8. Subir nuevos videos
      if (files.videos && files.videos.length > 0) {
        for (const videoFile of files.videos) {
          try {
            const uploadedVideo = await this.cloudinaryService.uploadVideo(
              videoFile,
              'usados/videos',
            );
            uploadedVideos.push(uploadedVideo);
          } catch (error) {
            await this.cleanupUploadedFiles(uploadedImages, uploadedVideos);
            throw new BadRequestException(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              `Error al subir video: ${error.message || 'Error desconocido'}`,
            );
          }
        }
        usado.videos = [...(usado.videos || []), ...uploadedVideos];
      }

      // 9. Subir nueva fotoSinFondo1
      if (files.fotoSinFondo1 && files.fotoSinFondo1.length > 0) {
        try {
          // Si ya existe una foto sin fondo 1, eliminarla primero
          if (usado.fotoSinFondo1) {
            await this.cloudinaryService.deleteMedia(
              usado.fotoSinFondo1.public_id,
            );
          }
          uploadedFotoSinFondo1 = await this.cloudinaryService.uploadImage(
            files.fotoSinFondo1[0],
            'usados/fotos-sin-fondo',
          );
          usado.fotoSinFondo1 = uploadedFotoSinFondo1;
        } catch (error) {
          await this.cleanupUploadedFiles(uploadedImages, uploadedVideos);
          if (uploadedFotoSinFondo1) {
            await this.cloudinaryService
              .deleteMedia(uploadedFotoSinFondo1.public_id)
              .catch(() => {});
          }
          throw new BadRequestException(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            `Error al subir fotoSinFondo1: ${error.message || 'Error desconocido'}`,
          );
        }
      }

      // 10. Subir nueva fotoSinFondo2
      if (files.fotoSinFondo2 && files.fotoSinFondo2.length > 0) {
        try {
          // Si ya existe una foto sin fondo 2, eliminarla primero
          if (usado.fotoSinFondo2) {
            await this.cloudinaryService.deleteMedia(
              usado.fotoSinFondo2.public_id,
            );
          }
          uploadedFotoSinFondo2 = await this.cloudinaryService.uploadImage(
            files.fotoSinFondo2[0],
            'usados/fotos-sin-fondo',
          );
          usado.fotoSinFondo2 = uploadedFotoSinFondo2;
        } catch (error) {
          await this.cleanupUploadedFiles(uploadedImages, uploadedVideos);
          if (uploadedFotoSinFondo1) {
            await this.cloudinaryService
              .deleteMedia(uploadedFotoSinFondo1.public_id)
              .catch(() => {});
          }
          if (uploadedFotoSinFondo2) {
            await this.cloudinaryService
              .deleteMedia(uploadedFotoSinFondo2.public_id)
              .catch(() => {});
          }
          throw new BadRequestException(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            `Error al subir fotoSinFondo2: ${error.message || 'Error desconocido'}`,
          );
        }
      }

      // 11. Actualizar otros campos del DTO (excepto los de eliminación)
      const {
        imagenesAEliminar,
        videosAEliminar,
        eliminarFotoSinFondo1,
        eliminarFotoSinFondo2,
        ...otherFields
      } = updateUsadoDto;
      // Silenciar warnings de variables no usadas (se desestructuran para excluirlas)
      void imagenesAEliminar;
      void videosAEliminar;
      void eliminarFotoSinFondo1;
      void eliminarFotoSinFondo2;
      Object.assign(usado, otherFields);

      // 12. Guardar cambios
      const updatedUsado = await usado.save();
      this.clearOptionsCache();

      return updatedUsado;
    } catch (error) {
      // Limpiar archivos subidos en caso de error
      await this.cleanupUploadedFiles(uploadedImages, uploadedVideos);
      if (uploadedFotoSinFondo1) {
        await this.cloudinaryService
          .deleteMedia(uploadedFotoSinFondo1.public_id)
          .catch(() => {});
      }
      if (uploadedFotoSinFondo2) {
        await this.cloudinaryService
          .deleteMedia(uploadedFotoSinFondo2.public_id)
          .catch(() => {});
      }

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Error al actualizar vehículo usado: ${error.message || 'Error desconocido'}`,
      );
    }
  }

  async changeStatus(id: string, changeStatusDto: ChangeStatusUsadoDto) {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de vehículo usado inválido');
      }

      const usado = await this.usadoModel.findById(id).exec();
      if (!usado) {
        throw new NotFoundException(
          `Vehículo usado con ID ${id} no encontrado`,
        );
      }

      if (changeStatusDto.estado === 'Vendido') {
        await this.cleanupUploadedFiles(
          usado.imagenes || [],
          usado.videos || [],
        );

        const updatedUsado = await this.usadoModel
          .findByIdAndUpdate(
            id,
            {
              estado: changeStatusDto.estado,
              imagenes: [],
              videos: [],
            },
            {
              new: true,
              runValidators: true,
            },
          )
          .exec();

        this.clearOptionsCache();

        return {
          message: `Vehículo usado marcado como vendido. Imágenes y videos eliminados para liberar espacio.`,
          usado: updatedUsado,
        };
      }

      const updatedUsado = await this.usadoModel
        .findByIdAndUpdate(
          id,
          { estado: changeStatusDto.estado },
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

      this.clearOptionsCache();

      return {
        message: `Estado del vehículo usado cambiado a "${changeStatusDto.estado}"`,
        usado: updatedUsado,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al cambiar el estado del vehículo usado',
      );
    }
  }

  async remove(id: string) {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de vehículo usado inválido');
      }

      const usado = await this.usadoModel.findById(id).exec();
      if (!usado) {
        throw new NotFoundException(
          `Vehículo usado con ID ${id} no encontrado`,
        );
      }

      await this.usadoModel.findByIdAndDelete(id).exec();
      this.clearOptionsCache();

      return {
        message: `Vehículo usado "${usado.titulo || usado.marca + ' ' + usado.modelo || 'Sin título'}" eliminado correctamente`,
        usado: usado,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al eliminar el vehículo usado',
      );
    }
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  private createAccentInsensitiveRegex(searchTerm: string): RegExp {
    const normalized = this.normalizeText(searchTerm);
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const pattern = escaped
      .replace(/a/g, '[aáàäâãå]')
      .replace(/e/g, '[eéèëê]')
      .replace(/i/g, '[iíìïî]')
      .replace(/o/g, '[oóòöôõ]')
      .replace(/u/g, '[uúùüû]')
      .replace(/n/g, '[nñ]')
      .replace(/c/g, '[cç]');

    return new RegExp(pattern, 'i');
  }

  async search(params: {
    q?: string;
    page?: number;
    limit?: number;
    sortBy?: keyof Usado | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
    filters?: {
      marca?: string;
      modelo?: string;
      estado?: string;
      tipos?: string;
      tipoCombustible?: string;
      transmisiones?: string;
      tracciones?: string;
    };
    ranges?: {
      kilometrajeMin?: number;
      kilometrajeMax?: number;
      anioFrom?: string;
      anioTo?: string;
    };
  }): Promise<{
    items: UsadoDocument[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    const {
      q,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      filters = {},
      ranges = {},
    } = params;

    let query = this.usadoModel.find();
    query = query.where('estado').ne('Vendido');

    if (q && q.trim()) {
      const searchRegex = this.createAccentInsensitiveRegex(q.trim());
      query = query.where({
        $or: [
          { titulo: { $regex: searchRegex } },
          { tipos: { $regex: searchRegex } },
          { variantes: { $regex: searchRegex } },
          { marca: { $regex: searchRegex } },
          { modelo: { $regex: searchRegex } },
          { tipoCombustible: { $regex: searchRegex } },
          { motor: { $regex: searchRegex } },
          { transmisiones: { $regex: searchRegex } },
          { tracciones: { $regex: searchRegex } },
          { descripcion: { $regex: searchRegex } },
        ],
      });
    }

    if (filters.marca) {
      const regex = this.createAccentInsensitiveRegex(filters.marca);
      query = query.where('marca').regex(regex);
    }
    if (filters.modelo) {
      const regex = this.createAccentInsensitiveRegex(filters.modelo);
      query = query.where('modelo').regex(regex);
    }
    if (filters.estado) {
      query = query.where('estado').equals(filters.estado);
    }
    if (filters.tipos) {
      const regex = this.createAccentInsensitiveRegex(filters.tipos);
      query = query.where('tipos').regex(regex);
    }
    if (filters.tipoCombustible) {
      const regex = this.createAccentInsensitiveRegex(filters.tipoCombustible);
      query = query.where('tipoCombustible').regex(regex);
    }
    if (filters.transmisiones) {
      const regex = this.createAccentInsensitiveRegex(filters.transmisiones);
      query = query.where('transmisiones').regex(regex);
    }
    if (filters.tracciones) {
      const regex = this.createAccentInsensitiveRegex(filters.tracciones);
      query = query.where('tracciones').regex(regex);
    }

    if (ranges.kilometrajeMin !== undefined) {
      query = query.where('kilometraje').gte(ranges.kilometrajeMin);
    }
    if (ranges.kilometrajeMax !== undefined) {
      query = query.where('kilometraje').lte(ranges.kilometrajeMax);
    }
    if (ranges.anioFrom) {
      query = query.where('anio').gte(new Date(ranges.anioFrom).getTime());
    }
    if (ranges.anioTo) {
      query = query.where('anio').lte(new Date(ranges.anioTo).getTime());
    }

    const skip = Math.max(0, (page - 1) * limit);
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    if (sortBy !== ('_id' as any)) {
      sort['_id'] = sortOrder === 'asc' ? 1 : -1;
    }

    const listQuery = query
      .clone()
      .sort(sort)
      .skip(skip)
      .limit(Math.min(limit, 100));
    const countQuery = query.clone().countDocuments();

    const items = (await listQuery.exec()) as UsadoDocument[];
    const total = await countQuery.exec();

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  async suggestions(field: string, queryText: string, limit = 10) {
    const normalizedQuery = this.normalizeText(queryText);

    const items = await this.usadoModel
      .find({} as FilterQuery<UsadoDocument>)
      .select({ [field]: 1 })
      .lean()
      .exec();

    const values = (items as Array<Record<string, unknown>>)
      .map((d) => d[field] as string)
      .filter(Boolean)
      .filter((value) => {
        const normalizedValue = this.normalizeText(value);
        return normalizedValue.startsWith(normalizedQuery);
      })
      .slice(0, Math.min(limit, 20));

    return Array.from(new Set(values));
  }

  async getUsadoOptions(): Promise<{
    marcas: string[];
    modelos: Record<string, string[]>;
    tipos: string[];
    combustibles: string[];
    transmisiones: string[];
    tracciones: string[];
    estados: string[];
  }> {
    const cacheKey = 'usado-options';

    const cachedOptions = this.optionsCache.get(cacheKey);
    if (cachedOptions) {
      return cachedOptions as {
        marcas: string[];
        modelos: Record<string, string[]>;
        tipos: string[];
        combustibles: string[];
        transmisiones: string[];
        tracciones: string[];
        estados: string[];
      };
    }

    try {
      const usados = await this.usadoModel
        .find({})
        .select(
          'marca modelo tipos tipoCombustible transmisiones tracciones estado',
        )
        .lean()
        .exec();

      const marcasSet = new Set<string>();
      const modelosPorMarca: Record<string, Set<string>> = {};
      const tiposSet = new Set<string>();
      const combustiblesSet = new Set<string>();
      const transmisionesSet = new Set<string>();
      const traccionesSet = new Set<string>();

      usados.forEach((usado) => {
        if (usado.marca) {
          marcasSet.add(usado.marca);

          if (usado.modelo) {
            if (!modelosPorMarca[usado.marca]) {
              modelosPorMarca[usado.marca] = new Set<string>();
            }
            modelosPorMarca[usado.marca].add(usado.modelo);
          }
        }

        if (usado.tipos) tiposSet.add(usado.tipos);
        if (usado.tipoCombustible) combustiblesSet.add(usado.tipoCombustible);
        if (usado.transmisiones) transmisionesSet.add(usado.transmisiones);
        if (usado.tracciones) traccionesSet.add(usado.tracciones);
      });

      const marcas = Array.from(marcasSet).sort();
      const tipos = Array.from(tiposSet).sort();
      const combustibles = Array.from(combustiblesSet).sort();
      const transmisiones = Array.from(transmisionesSet).sort();
      const tracciones = Array.from(traccionesSet).sort();

      const modelos: Record<string, string[]> = {};
      Object.keys(modelosPorMarca)
        .sort()
        .forEach((marca) => {
          modelos[marca] = Array.from(modelosPorMarca[marca]).sort();
        });

      const estados = ['Disponible', 'Reservado', 'Vendido'];

      const options = {
        marcas,
        modelos,
        tipos,
        combustibles,
        transmisiones,
        tracciones,
        estados,
      };

      this.optionsCache.set(cacheKey, options);

      return options;
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al obtener las opciones de vehículos usados: ' +
          (error as Error).message,
      );
    }
  }

  private clearOptionsCache(): void {
    this.optionsCache.del('usado-options');
  }
}
