import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, type FilterQuery } from 'mongoose';
import NodeCache from 'node-cache';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { MediaFile } from '../../cloudinary';
import { CreateNovedadDto } from './dto/create-novedad.dto';
import { UpdateNovedadDto } from './dto/update-novedad.dto';
import { CreateNovedadWithMediaDto } from './dto/create-novedad-with-media.dto';
import { Novedad } from './entities/novedad.entity';

@Injectable()
export class NovedadesService {
  private optionsCache: NodeCache;

  constructor(
    @InjectModel(Novedad.name)
    private readonly novedadModel: Model<Novedad>,
    private readonly cloudinaryService: CloudinaryService,
  ) {
    // Configurar cache con TTL de 30 minutos (1800 segundos)
    this.optionsCache = new NodeCache({ stdTTL: 1800, checkperiod: 600 });
  }

  async create(createNovedadDto: CreateNovedadDto) {
    try {
      const novedad = await this.novedadModel.create(createNovedadDto);

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return novedad;
    } catch {
      throw new InternalServerErrorException('Error al crear la novedad');
    }
  }

  async createWithMedia(
    createNovedadDto: CreateNovedadWithMediaDto,
    imageFiles: Express.Multer.File[],
  ) {
    const uploadedImages: MediaFile[] = [];

    try {
      // 1. Subir imágenes a Cloudinary
      if (imageFiles && imageFiles.length > 0) {
        for (const imageFile of imageFiles) {
          try {
            const uploadedImage = await this.cloudinaryService.uploadImage(
              imageFile,
              'novedades',
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

      // 2. Crear la novedad con las URLs de los archivos
      const novedadData = {
        ...createNovedadDto,
        imagenes: uploadedImages,
      };

      const novedad = await this.novedadModel.create(novedadData);

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return novedad;
    } catch (error) {
      // Si algo falla después de subir archivos, limpiar todo
      await this.cleanupUploadedFiles(uploadedImages);

      // Re-lanzar el error original si ya es BadRequestException
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Error al crear novedad: ${error.message || 'Error desconocido'}`,
      );
    }
  }

  // Método auxiliar para limpiar archivos subidos en caso de error
  private async cleanupUploadedFiles(images: MediaFile[]): Promise<void> {
    const cleanupPromises: Promise<unknown>[] = [];

    // Limpiar imágenes
    for (const image of images) {
      cleanupPromises.push(
        this.cloudinaryService.deleteMedia(image.public_id).catch(() => {
          // Ignorar errores de limpieza, no queremos fallar por esto
        }),
      );
    }

    // Ejecutar todas las limpiezas en paralelo
    await Promise.allSettled(cleanupPromises);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    sortBy?: keyof Novedad | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
    includeDeleted?: boolean;
    filters?: {
      categoria?: string;
      destacada?: boolean;
    };
  }): Promise<{
    items: Novedad[];
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
      includeDeleted = false,
      filters = {},
    } = params;

    const query = this.novedadModel.find();

    // EXCLUIR NOVEDADES ELIMINADAS (soft delete)
    if (!includeDeleted) {
      query.where('deleted').ne(true);
    }

    // Aplicar filtros
    if (filters.categoria) {
      query.where('categoria').regex(new RegExp(filters.categoria, 'i'));
    }
    if (filters.destacada !== undefined) {
      query.where('destacada').equals(filters.destacada);
    }

    const skip = Math.max(0, (page - 1) * limit);
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Agregar _id como ordenamiento secundario para consistencia
    if (sortBy !== ('_id' as any)) {
      sort['_id'] = sortOrder === 'asc' ? 1 : -1;
    }

    const listQuery = query
      .clone()
      .sort(sort)
      .skip(skip)
      .limit(Math.min(limit, 100));
    const countQuery = query.clone().countDocuments();

    try {
      const items = await listQuery.exec();
      const total = await countQuery.exec();

      return {
        items,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Error al obtener novedades: ${error.message || 'Error desconocido'}`,
      );
    }
  }

  async findOne(id: string) {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de novedad inválido');
      }

      const novedad = await this.novedadModel.findById(id).exec();
      if (!novedad) {
        throw new NotFoundException(`Novedad con ID ${id} no encontrada`);
      }

      // Incrementar contador de vistas
      novedad.vistas = (novedad.vistas || 0) + 1;
      await novedad.save();

      return novedad;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al buscar la novedad');
    }
  }

  async update(
    id: string,
    updateNovedadDto: UpdateNovedadDto,
    imageFiles?: Express.Multer.File[],
  ) {
    const uploadedImages: MediaFile[] = [];

    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de novedad inválido');
      }

      const novedad = await this.novedadModel.findById(id).exec();
      if (!novedad) {
        throw new NotFoundException(`Novedad con ID ${id} no encontrada`);
      }

      // Subir nuevas imágenes si se proporcionan
      if (imageFiles && imageFiles.length > 0) {
        for (const imageFile of imageFiles) {
          try {
            const uploadedImage = await this.cloudinaryService.uploadImage(
              imageFile,
              'novedades',
            );
            uploadedImages.push(uploadedImage);
          } catch (error) {
            throw new BadRequestException(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              `Error al subir imagen: ${error.message || 'Error desconocido'}`,
            );
          }
        }

        // Agregar nuevas imágenes a las existentes
        const existingImages = novedad.imagenes || [];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (updateNovedadDto as any).imagenes = [
          ...existingImages,
          ...uploadedImages,
        ];
      }

      const updatedNovedad = await this.novedadModel
        .findByIdAndUpdate(id, updateNovedadDto, {
          new: true,
          runValidators: true,
        })
        .exec();

      if (!updatedNovedad) {
        await this.cleanupUploadedFiles(uploadedImages);
        throw new NotFoundException(`Novedad con ID ${id} no encontrada`);
      }

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return updatedNovedad;
    } catch (error) {
      await this.cleanupUploadedFiles(uploadedImages);
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar la novedad');
    }
  }

  // Soft delete
  async remove(id: string) {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de novedad inválido');
      }

      const novedad = await this.novedadModel.findById(id).exec();
      if (!novedad) {
        throw new NotFoundException(`Novedad con ID ${id} no encontrada`);
      }

      // Soft delete: marcar como eliminada
      novedad.deleted = true;
      await novedad.save();

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return {
        message: `Novedad "${novedad.titulo}" eliminada correctamente (soft delete)`,
        novedad: novedad,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al eliminar la novedad');
    }
  }

  // Restaurar novedad eliminada
  async restore(id: string) {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de novedad inválido');
      }

      const novedad = await this.novedadModel.findById(id).exec();
      if (!novedad) {
        throw new NotFoundException(`Novedad con ID ${id} no encontrada`);
      }

      novedad.deleted = false;
      await novedad.save();

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return {
        message: `Novedad "${novedad.titulo}" restaurada correctamente`,
        novedad: novedad,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al restaurar la novedad');
    }
  }

  // Hard delete (eliminación permanente con limpieza de archivos)
  async hardDelete(id: string) {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de novedad inválido');
      }

      const novedad = await this.novedadModel.findById(id).exec();
      if (!novedad) {
        throw new NotFoundException(`Novedad con ID ${id} no encontrada`);
      }

      // Eliminar archivos de Cloudinary
      if (novedad.imagenes && novedad.imagenes.length > 0) {
        await this.cleanupUploadedFiles(novedad.imagenes);
      }

      // Eliminar de la base de datos
      await this.novedadModel.findByIdAndDelete(id).exec();

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return {
        message: `Novedad "${novedad.titulo}" eliminada permanentemente`,
        novedad: novedad,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al eliminar permanentemente la novedad',
      );
    }
  }

  // Eliminar una imagen específica de una novedad
  async deleteImage(id: string, publicId: string) {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de novedad inválido');
      }

      const novedad = await this.novedadModel.findById(id).exec();
      if (!novedad) {
        throw new NotFoundException(`Novedad con ID ${id} no encontrada`);
      }

      // Buscar la imagen en el array
      const imageIndex = novedad.imagenes?.findIndex(
        (img) => img.public_id === publicId,
      );

      if (imageIndex === undefined || imageIndex === -1) {
        throw new NotFoundException('Imagen no encontrada en esta novedad');
      }

      // Eliminar de Cloudinary
      await this.cloudinaryService.deleteMedia(publicId);

      // Eliminar del array
      novedad.imagenes?.splice(imageIndex, 1);
      await novedad.save();

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return {
        message: 'Imagen eliminada exitosamente',
        novedad,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al eliminar la imagen');
    }
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Elimina los acentos
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
    sortBy?: keyof Novedad | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
    includeDeleted?: boolean;
    filters?: {
      categoria?: string;
      destacada?: boolean;
    };
  }): Promise<{
    items: Novedad[];
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
      includeDeleted = false,
      filters = {},
    } = params;

    let query = this.novedadModel.find();

    // EXCLUIR NOVEDADES ELIMINADAS (soft delete)
    if (!includeDeleted) {
      query = query.where('deleted').ne(true);
    }

    // BÚSQUEDA GENERAL
    if (q && q.trim()) {
      const searchRegex = this.createAccentInsensitiveRegex(q.trim());
      query = query.where({
        $or: [
          { titulo: { $regex: searchRegex } },
          { contenido: { $regex: searchRegex } },
          { resumen: { $regex: searchRegex } },
          { categoria: { $regex: searchRegex } },
        ],
      });
    }

    // FILTROS ESPECÍFICOS
    if (filters.categoria) {
      const regex = this.createAccentInsensitiveRegex(filters.categoria);
      query = query.where('categoria').regex(regex);
    }
    if (filters.destacada !== undefined) {
      query = query.where('destacada').equals(filters.destacada);
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

    const items = await listQuery.exec();
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

    const items = await this.novedadModel
      .find({ deleted: { $ne: true } } as FilterQuery<Novedad>)
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

  async getNovedadOptions(): Promise<{
    categorias: string[];
  }> {
    const cacheKey = 'novedad-options';

    // Intentar obtener del cache primero
    const cachedOptions = this.optionsCache.get(cacheKey);
    if (cachedOptions) {
      return cachedOptions as {
        categorias: string[];
      };
    }

    try {
      // Obtener todas las novedades no eliminadas
      const novedades = await this.novedadModel
        .find({ deleted: { $ne: true } })
        .select('categoria')
        .lean()
        .exec();

      // Extraer valores únicos
      const categoriasSet = new Set<string>();

      novedades.forEach((novedad) => {
        if (novedad.categoria) {
          categoriasSet.add(novedad.categoria);
        }
      });

      // Convertir a arrays ordenados
      const categorias = Array.from(categoriasSet).sort();

      const options = {
        categorias,
      };

      // Guardar en cache
      this.optionsCache.set(cacheKey, options);

      return options;
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al obtener las opciones de novedades: ' +
          (error as Error).message,
      );
    }
  }

  // Obtener novedades destacadas
  async getFeatured(limit = 5) {
    return this.novedadModel
      .find({ destacada: true, deleted: { $ne: true } })
      .sort({ fechaPublicacion: -1 })
      .limit(limit)
      .exec();
  }

  // Obtener novedades recientes
  async getRecent(limit = 10) {
    return this.novedadModel
      .find({ deleted: { $ne: true } })
      .sort({ fechaPublicacion: -1 })
      .limit(limit)
      .exec();
  }

  // Obtener novedades por categoría
  async getByCategoria(categoria: string, page = 1, limit = 10) {
    const skip = Math.max(0, (page - 1) * limit);
    const regex = this.createAccentInsensitiveRegex(categoria);

    const query = this.novedadModel.find({
      categoria: { $regex: regex },
      deleted: { $ne: true },
    });

    const items = await query
      .sort({ fechaPublicacion: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await this.novedadModel.countDocuments({
      categoria: { $regex: regex },
      deleted: { $ne: true },
    });

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  // Método para limpiar el cache cuando se modifica la data
  private clearOptionsCache(): void {
    this.optionsCache.del('novedad-options');
  }
}
