import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type FilterQuery, type Model } from 'mongoose';
import NodeCache from 'node-cache';
import { CreateVehiculos0kmDto } from './dto/create-vehiculos0km.dto';
import { UpdateVehiculos0kmDto } from './dto/update-vehiculos0km.dto';
import { ChangeStatusVehiculos0kmDto } from './dto/change-status-vehiculos0km.dto';
import {
  Vehiculos0km,
  Vehiculos0kmDocument,
} from './entities/vehiculos0km.entity';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { MediaFile } from '../../cloudinary';

@Injectable()
export class Vehiculos0kmService {
  private optionsCache: NodeCache;

  constructor(
    @InjectModel(Vehiculos0km.name)
    private readonly vehiculos0kmModel: Model<Vehiculos0kmDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {
    // Configurar cache con TTL de 30 minutos (1800 segundos)
    this.optionsCache = new NodeCache({ stdTTL: 1800, checkperiod: 600 });
  }

  async create(createVehiculos0kmDto: CreateVehiculos0kmDto) {
    try {
      const vehiculo = await this.vehiculos0kmModel.create(
        createVehiculos0kmDto,
      );

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return vehiculo;
    } catch {
      throw new InternalServerErrorException('Error al crear el vehículo 0km');
    }
  }

  async createWithMedia(
    createVehiculos0kmDto: CreateVehiculos0kmDto,
    imageFiles: Express.Multer.File[],
    videoFiles: Express.Multer.File[],
  ) {
    const uploadedImages: MediaFile[] = [];
    const uploadedVideos: MediaFile[] = [];

    try {
      // 1. Subir imágenes a Cloudinary
      if (imageFiles && imageFiles.length > 0) {
        for (const imageFile of imageFiles) {
          try {
            const uploadedImage = await this.cloudinaryService.uploadImage(
              imageFile,
              'vehiculos0km/images',
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

      // 2. Subir videos a Cloudinary
      if (videoFiles && videoFiles.length > 0) {
        for (const videoFile of videoFiles) {
          try {
            const uploadedVideo = await this.cloudinaryService.uploadVideo(
              videoFile,
              'vehiculos0km/videos',
            );
            uploadedVideos.push(uploadedVideo);
          } catch (error) {
            // Si falla la subida de video, limpiar las imágenes ya subidas
            await this.cleanupUploadedFiles(uploadedImages, []);

            throw new BadRequestException(
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              `Error al subir video: ${error.message || 'Error desconocido'}`,
            );
          }
        }
      }

      // 3. Crear el vehículo con las URLs de los archivos
      const vehiculoData = {
        ...createVehiculos0kmDto,
        imagenes: uploadedImages,
        videos: uploadedVideos,
      };

      const vehiculo = await this.vehiculos0kmModel.create(vehiculoData);

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return vehiculo;
    } catch (error) {
      // Si algo falla después de subir archivos, limpiar todo
      await this.cleanupUploadedFiles(uploadedImages, uploadedVideos);

      // Re-lanzar el error original si ya es BadRequestException
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        `Error al crear vehículo: ${error.message || 'Error desconocido'}`,
      );
    }
  }

  // Método auxiliar para limpiar archivos subidos en caso de error
  private async cleanupUploadedFiles(
    images: MediaFile[],
    videos: MediaFile[],
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

    // Ejecutar todas las limpiezas en paralelo
    await Promise.allSettled(cleanupPromises);
  }

  async findAll(params: {
    page?: number;
    limit?: number;
    sortBy?: keyof Vehiculos0km | 'createdAt' | 'updatedAt';
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
    items: Vehiculos0kmDocument[];
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

    const query = this.vehiculos0kmModel.find();

    // EXCLUIR VEHÍCULOS VENDIDOS (nunca mostrar)
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

    const items = (await listQuery.exec()) as Vehiculos0kmDocument[];
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
        throw new BadRequestException('ID de vehículo inválido');
      }

      const vehiculo = await this.vehiculos0kmModel.findById(id).exec();
      if (!vehiculo) {
        throw new NotFoundException(`Vehículo 0km con ID ${id} no encontrado`);
      }

      return vehiculo;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al buscar el vehículo 0km');
    }
  }

  async update(id: string, updateVehiculos0kmDto: UpdateVehiculos0kmDto) {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de vehículo inválido');
      }

      const updatedVehiculo = await this.vehiculos0kmModel
        .findByIdAndUpdate(id, updateVehiculos0kmDto, {
          new: true,
          runValidators: true,
        })
        .exec();

      if (!updatedVehiculo) {
        throw new NotFoundException(`Vehículo 0km con ID ${id} no encontrado`);
      }

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return updatedVehiculo;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al actualizar el vehículo 0km',
      );
    }
  }

  async changeStatus(id: string, changeStatusDto: ChangeStatusVehiculos0kmDto) {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de vehículo inválido');
      }

      // Buscar el vehículo antes de actualizar
      const vehiculo = await this.vehiculos0kmModel.findById(id).exec();
      if (!vehiculo) {
        throw new NotFoundException(`Vehículo 0km con ID ${id} no encontrado`);
      }

      // Si se está marcando como VENDIDO, eliminar archivos de Cloudinary
      if (changeStatusDto.estado === 'Vendido') {
        await this.cleanupUploadedFiles(
          vehiculo.imagenes || [],
          vehiculo.videos || [],
        );

        // Actualizar el vehículo y limpiar los arrays de archivos
        const updatedVehiculo = await this.vehiculos0kmModel
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
          message: `Vehículo marcado como vendido. Imágenes y videos eliminados para liberar espacio.`,
          vehiculo: updatedVehiculo,
        };
      }

      // Para otros estados, solo actualizar el estado
      const updatedVehiculo = await this.vehiculos0kmModel
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
        message: `Estado del vehículo cambiado a "${changeStatusDto.estado}"`,
        vehiculo: updatedVehiculo,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al cambiar el estado del vehículo 0km',
      );
    }
  }

  async remove(id: string) {
    try {
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de vehículo inválido');
      }

      const vehiculo = await this.vehiculos0kmModel.findById(id).exec();
      if (!vehiculo) {
        throw new NotFoundException(`Vehículo 0km con ID ${id} no encontrado`);
      }

      await this.vehiculos0kmModel.findByIdAndDelete(id).exec();

      // Limpiar cache de opciones
      this.clearOptionsCache();

      return {
        message: `Vehículo "${vehiculo.titulo || vehiculo.marca + ' ' + vehiculo.modelo || 'Sin título'}" eliminado correctamente`,
        vehiculo: vehiculo,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error al eliminar el vehículo 0km',
      );
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
    sortBy?: keyof Vehiculos0km | 'createdAt' | 'updatedAt';
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
    items: Vehiculos0kmDocument[];
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

    let query = this.vehiculos0kmModel.find();

    // EXCLUIR VEHÍCULOS VENDIDOS (nunca mostrar)
    query = query.where('estado').ne('Vendido');

    // BÚSQUEDA GENERAL
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

    const items = (await listQuery.exec()) as Vehiculos0kmDocument[];
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

    const items = await this.vehiculos0kmModel
      .find({} as FilterQuery<Vehiculos0kmDocument>)
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

  async getVehiculoOptions(): Promise<{
    marcas: string[];
    modelos: Record<string, string[]>;
    tipos: string[];
    combustibles: string[];
    transmisiones: string[];
    tracciones: string[];
    estados: string[];
  }> {
    const cacheKey = 'vehiculo-options';

    // Intentar obtener del cache primero
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
      // Obtener todos los vehículos (incluyendo vendidos para opciones completas)
      const vehiculos = await this.vehiculos0kmModel
        .find({})
        .select(
          'marca modelo tipos tipoCombustible transmisiones tracciones estado',
        )
        .lean()
        .exec();

      // Extraer valores únicos para cada campo
      const marcasSet = new Set<string>();
      const modelosPorMarca: Record<string, Set<string>> = {};
      const tiposSet = new Set<string>();
      const combustiblesSet = new Set<string>();
      const transmisionesSet = new Set<string>();
      const traccionesSet = new Set<string>();

      vehiculos.forEach((vehiculo) => {
        // Marcas
        if (vehiculo.marca) {
          marcasSet.add(vehiculo.marca);

          // Modelos por marca
          if (vehiculo.modelo) {
            if (!modelosPorMarca[vehiculo.marca]) {
              modelosPorMarca[vehiculo.marca] = new Set<string>();
            }
            modelosPorMarca[vehiculo.marca].add(vehiculo.modelo);
          }
        }

        // Otros campos
        if (vehiculo.tipos) tiposSet.add(vehiculo.tipos);
        if (vehiculo.tipoCombustible)
          combustiblesSet.add(vehiculo.tipoCombustible);
        if (vehiculo.transmisiones)
          transmisionesSet.add(vehiculo.transmisiones);
        if (vehiculo.tracciones) traccionesSet.add(vehiculo.tracciones);
      });

      // Convertir a arrays ordenados
      const marcas = Array.from(marcasSet).sort();
      const tipos = Array.from(tiposSet).sort();
      const combustibles = Array.from(combustiblesSet).sort();
      const transmisiones = Array.from(transmisionesSet).sort();
      const tracciones = Array.from(traccionesSet).sort();

      // Convertir modelos por marca a objetos con arrays ordenados
      const modelos: Record<string, string[]> = {};
      Object.keys(modelosPorMarca)
        .sort()
        .forEach((marca) => {
          modelos[marca] = Array.from(modelosPorMarca[marca]).sort();
        });

      // Estados fijos (definidos en el schema)
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

      // Guardar en cache
      this.optionsCache.set(cacheKey, options);

      return options;
    } catch (error) {
      throw new InternalServerErrorException(
        'Error al obtener las opciones de vehículos: ' +
          (error as Error).message,
      );
    }
  }

  // Método para limpiar el cache cuando se modifica la data
  private clearOptionsCache(): void {
    this.optionsCache.del('vehiculo-options');
  }
}
