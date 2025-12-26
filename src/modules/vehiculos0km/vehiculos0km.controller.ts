import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { Vehiculos0kmService } from './vehiculos0km.service';
import { CreateVehiculos0kmDto } from './dto/create-vehiculos0km.dto';
import { CreateVehiculos0kmWithMediaDto } from './dto/create-vehiculos0km-with-media.dto';
import { UpdateVehiculos0kmDto } from './dto/update-vehiculos0km.dto';
import { ChangeStatusVehiculos0kmDto } from './dto/change-status-vehiculos0km.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import type {
  Vehiculos0km,
  Vehiculos0kmDocument,
} from './entities/vehiculos0km.entity';

@Controller('vehiculos0km')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class Vehiculos0kmController {
  constructor(private readonly vehiculos0kmService: Vehiculos0kmService) {}

  @Post()
  create(@Body() createVehiculos0kmDto: CreateVehiculos0kmDto) {
    return this.vehiculos0kmService.create(createVehiculos0kmDto);
  }

  @Post('create-with-media')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'imagenes', maxCount: 10 },
      { name: 'videos', maxCount: 5 },
    ]),
  )
  async createWithMedia(
    @Body() createVehiculos0kmDto: CreateVehiculos0kmWithMediaDto,
    @UploadedFiles()
    files: {
      imagenes?: Express.Multer.File[];
      videos?: Express.Multer.File[];
    },
  ) {
    try {
      // Validar que al menos se proporcione información básica del vehículo
      if (!createVehiculos0kmDto.marca || !createVehiculos0kmDto.modelo) {
        throw new BadRequestException(
          'Marca y modelo son campos obligatorios para crear un vehículo',
        );
      }

      const result = await this.vehiculos0kmService.createWithMedia(
        createVehiculos0kmDto,
        files.imagenes || [],
        files.videos || [],
      );

      return {
        success: true,
        message: 'Vehículo creado exitosamente con archivos multimedia',
        data: result,
      };
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const message = error.message || 'Error al crear el vehículo';
      throw new BadRequestException({
        success: false,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        message,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        error: error,
      });
    }
  }

  @Get()
  findAll(@Query() query: Record<string, string>) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const sortBy =
      (query.sortBy as keyof Vehiculos0km | 'createdAt' | 'updatedAt') ??
      'createdAt';
    const sortOrder = (query.sortOrder as 'asc' | 'desc') ?? 'desc';

    const filters = {
      marca: query.marca,
      modelo: query.modelo,
      estado: query.estado,
      tipos: query.tipos,
      tipoCombustible: query.tipoCombustible,
      transmisiones: query.transmisiones,
      tracciones: query.tracciones,
    };

    const ranges = {
      kilometrajeMin: query.kilometrajeMin
        ? Number(query.kilometrajeMin)
        : undefined,
      kilometrajeMax: query.kilometrajeMax
        ? Number(query.kilometrajeMax)
        : undefined,
      anioFrom: query.anioFrom,
      anioTo: query.anioTo,
    };

    return this.vehiculos0kmService.findAll({
      page,
      limit,
      sortBy,
      sortOrder,
      filters,
      ranges,
    });
  }

  @Post('search')
  search(
    @Body()
    body: {
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
    },
  ) {
    const {
      q,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      filters = {},
      ranges = {},
    } = body;

    return this.vehiculos0kmService.search({
      q,
      page,
      limit,
      sortBy,
      sortOrder,
      filters,
      ranges,
    });
  }

  @Get('options')
  @HttpCode(HttpStatus.OK)
  getVehiculoOptions() {
    return this.vehiculos0kmService.getVehiculoOptions();
  }

  @Get('suggestions')
  suggestions(
    @Query('field') field: string,
    @Query('query') text: string,
    @Query('limit') limit?: string,
  ) {
    return this.vehiculos0kmService.suggestions(
      field,
      text ?? '',
      limit ? Number(limit) : 10,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehiculos0kmService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateVehiculos0kmDto: UpdateVehiculos0kmDto,
  ): Promise<{ message: string; vehiculo: Vehiculos0kmDocument }> {
    const vehiculo = await this.vehiculos0kmService.update(
      id,
      updateVehiculos0kmDto,
    );

    return {
      message: 'Vehículo 0km actualizado correctamente',
      vehiculo,
    };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  changeStatus(
    @Param('id') id: string,
    @Body() changeStatusDto: ChangeStatusVehiculos0kmDto,
  ) {
    return this.vehiculos0kmService.changeStatus(id, changeStatusDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.vehiculos0kmService.remove(id);
  }
}
