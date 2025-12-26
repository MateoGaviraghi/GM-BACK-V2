import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type FilterQuery, type Model } from 'mongoose';
import NodeCache from 'node-cache';
import { CreateRemolqueDto } from './dto/create-remolque.dto';
import { UpdateRemolqueDto } from './dto/update-remolque.dto';
import { ChangeStatusRemolqueDto } from './dto/change-status-remolque.dto';
import { Remolque, RemolqueDocument } from './entities/remolque.entity';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { MediaFile } from '../../cloudinary';

@Injectable()
export class RemolquesService {
  private optionsCache: NodeCache;

  constructor(
    @InjectModel(Remolque.name)
    private readonly remolqueModel: Model<RemolqueDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {
    // Configurar cache con TTL de 30 minutos (1800 segundos)
    this.optionsCache = new NodeCache({ stdTTL: 1800, checkperiod: 600 });
  }

  async create(createRemolqueDto: CreateRemolqueDto) {
    try {
      const remolque = await this.remolqueModel.create(createRemolqueDto);

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return remolque;
    } catch {
      throw new InternalServerErrorException('Error al crear el remolque');
    }
  }

  async createWithMedia(
    createRemolqueDto: CreateRemolqueDto,
    imageFiles: Express.Multer.File[],
    videoFiles: Express.Multer.File[],
    fotoSinFondo1?: Express.Multer.File,
    fotoSinFondo2?: Express.Multer.File,
  ) {
    const uploadedImages: MediaFile[] = [];
    const uploadedVideos: MediaFile[] = [];
    let uploadedFotoSinFondo1: MediaFile | undefined;
    let uploadedFotoSinFondo2: MediaFile | undefined;

    try {
      // 1. Subir imágenes a Cloudinary
      if (imageFiles && imageFiles.length > 0) {
        for (const imageFile of imageFiles) {
          try {
            const uploadedImage = await this.cloudinaryService.uploadImage(
              imageFile,
              'remolques/images',
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

      // 2. Subir foto sin fondo 1
      if (fotoSinFondo1) {
        try {
          uploadedFotoSinFondo1 = await this.cloudinaryService.uploadImage(
            fotoSinFondo1,
            'remolques/fotos-sin-fondo',
          );
        } catch (error) {
          await this.cleanupUploadedFiles(uploadedImages, []);
          throw new BadRequestException(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            `Error al subir foto sin fondo 1: ${error.message || 'Error desconocido'}`,
          );
        }
      }

      // 3. Subir foto sin fondo 2
      if (fotoSinFondo2) {
        try {
          uploadedFotoSinFondo2 = await this.cloudinaryService.uploadImage(
            fotoSinFondo2,
            'remolques/fotos-sin-fondo',
          );
        } catch (error) {
          await this.cleanupUploadedFiles(
            uploadedImages,
            [],
            uploadedFotoSinFondo1,
          );
          throw new BadRequestException(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            `Error al subir foto sin fondo 2: ${error.message || 'Error desconocido'}`,
          );
        }
      }

      // 4. Subir videos a Cloudinary
      if (videoFiles && videoFiles.length > 0) {
        for (const videoFile of videoFiles) {
          try {
            const uploadedVideo = await this.cloudinaryService.uploadVideo(
              videoFile,
              'remolques/videos',
            );
            uploadedVideos.push(uploadedVideo);
          } catch (error) {
            // Si falla la subida de video, limpiar las imágenes ya subidas
            await this.cleanupUploadedFiles(
              uploadedImages,
              [],
              uploadedFotoSinFondo1,
              uploadedFotoSinFondo2,
            );

            throw new BadRequestException(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              `Error al subir video: ${error.message || 'Error desconocido'}`,
            );
          }
        }
      }

      // 5. Crear el remolque con las URLs de los archivos
      const remolqueData = {
        ...createRemolqueDto,
        imagenes: uploadedImages,
        videos: uploadedVideos,
        fotoSinFondo1: uploadedFotoSinFondo1,
        fotoSinFondo2: uploadedFotoSinFondo2,
      };

      const remolque = await this.remolqueModel.create(remolqueData);

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return remolque;
    } catch (error) {
      // Si algo falla después de subir archivos, limpiar todo
      await this.cleanupUploadedFiles(
        uploadedImages,
        uploadedVideos,
        uploadedFotoSinFondo1,
        uploadedFotoSinFondo2,
      );

      // Re-lanzar el error original si ya es BadRequestException
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Error al crear remolque: ${error.message || 'Error desconocido'}`,
      );
    }
  }

  // Método auxiliar para limpiar archivos subidos en caso de error
  private async cleanupUploadedFiles(
    images: MediaFile[],
    videos: MediaFile[],
    fotoSinFondo1?: MediaFile,
    fotoSinFondo2?: MediaFile,
  ): Promise<void> {
    const cleanupPromises: Promise<unknown>[] = [];

    // Limpiar imágenes
    for (const image of images) {
      cleanupPromises.push(
        this.cloudinaryService.deleteMedia(image.public_id).catch(() => {
          // Ignorar errores de limpieza, no queremos fallar por esto
        }),
      );
    }

    // Limpiar videos
    for (const video of videos) {
      cleanupPromises.push(
        this.cloudinaryService.deleteMedia(video.public_id).catch(() => {
          // Ignorar errores de limpieza, no queremos fallar por esto
        }),
      );
    }

    // Limpiar foto sin fondo 1
    if (fotoSinFondo1) {
      cleanupPromises.push(
        this.cloudinaryService
          .deleteMedia(fotoSinFondo1.public_id)
          .catch(() => {
            // Ignorar errores de limpieza
          }),
      );
    }

    // Limpiar foto sin fondo 2
    if (fotoSinFondo2) {
      cleanupPromises.push(
        this.cloudinaryService
          .deleteMedia(fotoSinFondo2.public_id)
          .catch(() => {
            // Ignorar errores de limpieza
          }),
      );
    }

    // Ejecutar todas las limpiezas en paralelo
    await Promise.allSettled(cleanupPromises);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    sortBy?: keyof Remolque | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
    filters?: {
      marca?: string;
      modelo?: string;
      estado?: string;
      condicion?: string;
      categoria?: string;
      tipoCarroceria?: string;
      cantidadEjes?: number;
    };
    ranges?: {
      kilometrajeMin?: number;
      kilometrajeMax?: number;
      anioFrom?: string;
      anioTo?: string;
      taraMin?: number;
      taraMax?: number;
    };
  }): Promise<{
    items: RemolqueDocument[];
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

    const query = this.remolqueModel.find();

    // EXCLUIR REMOLQUES VENDIDOS (nunca mostrar)
    query.where('estado').ne('Vendido');

    // Aplicar filtros
    if (filters.marca) {
      query.where('marca').regex(new RegExp(filters.marca, 'i'));
    }
    if (filters.modelo) {
      query.where('modelo').regex(new RegExp(filters.modelo, 'i'));
    }
    if (filters.estado) {
      query.where('estado').equals(filters.estado);
    }
    if (filters.condicion) {
      query.where('condicion').equals(filters.condicion);
    }
    if (filters.categoria) {
      query.where('categoria').equals(filters.categoria);
    }
    if (filters.tipoCarroceria) {
      query
        .where('tipoCarroceria')
        .regex(new RegExp(filters.tipoCarroceria, 'i'));
    }
    if (filters.cantidadEjes) {
      query.where('cantidadEjes').equals(filters.cantidadEjes);
    }

    // Aplicar rangos
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
    if (ranges.taraMin !== undefined) {
      query.where('tara').gte(ranges.taraMin);
    }
    if (ranges.taraMax !== undefined) {
      query.where('tara').lte(ranges.taraMax);
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

    const items = (await listQuery.exec()) as RemolqueDocument[];
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
        throw new BadRequestException('ID de remolque inválido');
      }

      const remolque = await this.remolqueModel.findById(id).exec();
      if (!remolque) {
        throw new NotFoundException(`Remolque con ID ${id} no encontrado`);
      }

      return remolque;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al buscar el remolque');
    }
  }

  async update(id: string, updateRemolqueDto: UpdateRemolqueDto) {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de remolque inválido');
      }

      const updatedRemolque = await this.remolqueModel
        .findByIdAndUpdate(id, updateRemolqueDto, {
          new: true,
          runValidators: true,
        })
        .exec();

      if (!updatedRemolque) {
        throw new NotFoundException(`Remolque con ID ${id} no encontrado`);
      }

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return updatedRemolque;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar el remolque');
    }
  }

  async changeStatus(id: string, changeStatusDto: ChangeStatusRemolqueDto) {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de remolque inválido');
      }

      // Buscar el remolque antes de actualizar
      const remolque = await this.remolqueModel.findById(id).exec();
      if (!remolque) {
        throw new NotFoundException(`Remolque con ID ${id} no encontrado`);
      }

      // Si se está marcando como VENDIDO, eliminar archivos de Cloudinary
      if (changeStatusDto.estado === 'Vendido') {
        await this.cleanupUploadedFiles(
          remolque.imagenes || [],
          remolque.videos || [],
        );

        // Actualizar el remolque y limpiar los arrays de archivos
        const updatedRemolque = await this.remolqueModel
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

        // Limpiar cache de opciones
        this.clearOptionsCache();

        return {
          message: `Remolque marcado como vendido. Imágenes y videos eliminados para liberar espacio.`,
          remolque: updatedRemolque,
        };
      }

      // Para otros estados, solo actualizar el estado
      const updatedRemolque = await this.remolqueModel
        .findByIdAndUpdate(
          id,
          { estado: changeStatusDto.estado },
          {
            new: true,
            runValidators: true,
          },
        )
        .exec();

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return {
        message: `Estado del remolque cambiado a "${changeStatusDto.estado}"`,
        remolque: updatedRemolque,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al cambiar el estado del remolque',
      );
    }
  }

  async remove(id: string) {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de remolque inválido');
      }

      const remolque = await this.remolqueModel.findById(id).exec();
      if (!remolque) {
        throw new NotFoundException(`Remolque con ID ${id} no encontrado`);
      }

      await this.remolqueModel.findByIdAndDelete(id).exec();

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return {
        message: `Remolque "${remolque.titulo || remolque.marca + ' ' + remolque.modelo || 'Sin título'}" eliminado correctamente`,
        remolque: remolque,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al eliminar el remolque');
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
    sortBy?: keyof Remolque | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
    filters?: {
      marca?: string;
      modelo?: string;
      estado?: string;
      condicion?: string;
      categoria?: string;
      tipoCarroceria?: string;
      cantidadEjes?: number;
    };
    ranges?: {
      kilometrajeMin?: number;
      kilometrajeMax?: number;
      anioFrom?: string;
      anioTo?: string;
      taraMin?: number;
      taraMax?: number;
    };
  }): Promise<{
    items: RemolqueDocument[];
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

    let query = this.remolqueModel.find();

    // EXCLUIR REMOLQUES VENDIDOS (nunca mostrar)
    query = query.where('estado').ne('Vendido');

    // BÚSQUEDA GENERAL
    if (q && q.trim()) {
      const searchRegex = this.createAccentInsensitiveRegex(q.trim());
      query = query.where({
        $or: [
          { titulo: { $regex: searchRegex } },
          { marca: { $regex: searchRegex } },
          { modelo: { $regex: searchRegex } },
          { tipoCarroceria: { $regex: searchRegex } },
          { descripcion: { $regex: searchRegex } },
        ],
      });
    }

    // FILTROS ESPECÍFICOS
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
    if (filters.condicion) {
      query = query.where('condicion').equals(filters.condicion);
    }
    if (filters.categoria) {
      query = query.where('categoria').equals(filters.categoria);
    }
    if (filters.tipoCarroceria) {
      const regex = this.createAccentInsensitiveRegex(filters.tipoCarroceria);
      query = query.where('tipoCarroceria').regex(regex);
    }
    if (filters.cantidadEjes) {
      query = query.where('cantidadEjes').equals(filters.cantidadEjes);
    }

    // RANGOS
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
    if (ranges.taraMin !== undefined) {
      query = query.where('tara').gte(ranges.taraMin);
    }
    if (ranges.taraMax !== undefined) {
      query = query.where('tara').lte(ranges.taraMax);
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

    const items = (await listQuery.exec()) as RemolqueDocument[];
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

    const items = await this.remolqueModel
      .find({} as FilterQuery<RemolqueDocument>)
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

  async getRemolqueOptions(): Promise<{
    marcas: string[];
    modelos: Record<string, string[]>;
    condiciones: string[];
    categorias: string[];
    tiposCarroceria: string[];
    estados: string[];
  }> {
    const cacheKey = 'remolque-options';

    // Intentar obtener del cache primero
    const cachedOptions = this.optionsCache.get(cacheKey);
    if (cachedOptions) {
      return cachedOptions as {
        marcas: string[];
        modelos: Record<string, string[]>;
        condiciones: string[];
        categorias: string[];
        tiposCarroceria: string[];
        estados: string[];
      };
    }

    try {
      // Obtener todos los remolques (incluyendo vendidos para opciones completas)
      const remolques = await this.remolqueModel
        .find({})
        .select('marca modelo condicion categoria tipoCarroceria estado')
        .lean()
        .exec();

      // Extraer valores únicos para cada campo
      const marcasSet = new Set<string>();
      const modelosPorMarca: Record<string, Set<string>> = {};
      const tiposCarroceriaSet = new Set<string>();

      remolques.forEach((remolque) => {
        // Marcas
        if (remolque.marca) {
          marcasSet.add(remolque.marca);

          // Modelos por marca
          if (remolque.modelo) {
            if (!modelosPorMarca[remolque.marca]) {
              modelosPorMarca[remolque.marca] = new Set<string>();
            }
            modelosPorMarca[remolque.marca].add(remolque.modelo);
          }
        }

        // Otros campos
        if (remolque.tipoCarroceria)
          tiposCarroceriaSet.add(remolque.tipoCarroceria);
      });

      // Convertir a arrays ordenados
      const marcas = Array.from(marcasSet).sort();
      const tiposCarroceria = Array.from(tiposCarroceriaSet).sort();

      // Convertir modelos por marca a objetos con arrays ordenados
      const modelos: Record<string, string[]> = {};
      Object.keys(modelosPorMarca)
        .sort()
        .forEach((marca) => {
          modelos[marca] = Array.from(modelosPorMarca[marca]).sort();
        });

      // Valores fijos (definidos en el schema)
      const condiciones = ['0KM', 'USADO'];
      const categorias = ['ACOPLADO', 'SEMIREMOLQUE', 'BITREN', 'CARROCERIA'];
      const estados = ['Disponible', 'Reservado', 'Vendido'];

      const options = {
        marcas,
        modelos,
        condiciones,
        categorias,
        tiposCarroceria,
        estados,
      };

      // Guardar en cache
      this.optionsCache.set(cacheKey, options);

      return options;
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al obtener las opciones de remolques: ' +
          (error as Error).message,
      );
    }
  }

  // Método para limpiar el cache cuando se modifica la data
  private clearOptionsCache(): void {
    this.optionsCache.del('remolque-options');
  }
}
