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
import { UsadosService } from './usados.service';
import { CreateUsadoDto } from './dto/create-usado.dto';
import { CreateUsadoWithMediaDto } from './dto/create-usado-with-media.dto';
import { UpdateUsadoDto } from './dto/update-usado.dto';
import { ChangeStatusUsadoDto } from './dto/change-status-usado.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import type { Usado, UsadoDocument } from './entities/usado.entity';

@Controller('usados')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class UsadosController {
  constructor(private readonly usadosService: UsadosService) {}

  @Post()
  create(@Body() createUsadoDto: CreateUsadoDto) {
    return this.usadosService.create(createUsadoDto);
  }

  @Post('create-with-media')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'imagenes', maxCount: 10 },
      { name: 'videos', maxCount: 5 },
    ]),
  )
  async createWithMedia(
    @Body() createUsadoDto: CreateUsadoWithMediaDto,
    @UploadedFiles()
    files: {
      imagenes?: Express.Multer.File[];
      videos?: Express.Multer.File[];
    },
  ) {
    try {
      if (!createUsadoDto.marca || !createUsadoDto.modelo) {
        throw new BadRequestException(
          'Marca y modelo son campos obligatorios para crear un vehículo usado',
        );
      }

      const result = await this.usadosService.createWithMedia(
        createUsadoDto,
        files.imagenes || [],
        files.videos || [],
      );

      return {
        success: true,
        message: 'Vehículo usado creado exitosamente con archivos multimedia',
        data: result,
      };
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
      const message = error.message || 'Error al crear el vehículo usado';
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
      (query.sortBy as keyof Usado | 'createdAt' | 'updatedAt') ?? 'createdAt';
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

    return this.usadosService.findAll({
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

    return this.usadosService.search({
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
  getUsadoOptions() {
    return this.usadosService.getUsadoOptions();
  }

  @Get('suggestions')
  suggestions(
    @Query('field') field: string,
    @Query('query') text: string,
    @Query('limit') limit?: string,
  ) {
    return this.usadosService.suggestions(
      field,
      text ?? '',
      limit ? Number(limit) : 10,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usadosService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateUsadoDto: UpdateUsadoDto,
  ): Promise<{ message: string; usado: UsadoDocument }> {
    const usado = await this.usadosService.update(id, updateUsadoDto);

    return {
      message: 'Vehículo usado actualizado correctamente',
      usado,
    };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  changeStatus(
    @Param('id') id: string,
    @Body() changeStatusDto: ChangeStatusUsadoDto,
  ) {
    return this.usadosService.changeStatus(id, changeStatusDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string) {
    return this.usadosService.remove(id);
  }
}
