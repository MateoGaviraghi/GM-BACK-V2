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
  Res,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import type { Cliente, ClienteDocument } from './entities/cliente.entity';

@Controller('clientes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  create(@Body() createClienteDto: CreateClienteDto) {
    return this.clientesService.create(createClienteDto);
  }

  @Get()
  findAll(
    @Query()
    query: Record<string, string>,
  ) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const sortBy =
      (query.sortBy as keyof Cliente | 'createdAt' | 'updatedAt') ??
      'createdAt';
    const sortOrder = (query.sortOrder as 'asc' | 'desc') ?? 'desc';
    const q = query.q;
    const filters = {
      provincia: query.provincia,
      localidad: query.localidad,
      tipoVehiculo: query.tipoVehiculo,
      marca: query.marca,
      modelo: query.modelo,
      productoServicio: query.productoServicio,
      nombreCompleto: query.nombreCompleto,
      correoElectronico: query.correoElectronico,
      telefonoCelular: query.telefonoCelular,
      tipoCliente: query.tipoCliente,
      observaciones: query.observaciones,
    };
    const ranges = {
      anioCompraMin: query.anioCompraMin
        ? Number(query.anioCompraMin)
        : undefined,
      anioCompraMax: query.anioCompraMax
        ? Number(query.anioCompraMax)
        : undefined,
      fechaNacimientoFrom: query.fechaNacimientoFrom,
      fechaNacimientoTo: query.fechaNacimientoTo,
    };
    return this.clientesService.search({
      q,
      page,
      limit,
      sortBy,
      sortOrder,
      filters,
      ranges,
    });
  }

  @Post('search')
  postSearch(
    @Body()
    body: {
      q?: string;
      page?: number;
      limit?: number;
      sortBy?: keyof Cliente | 'createdAt' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
      filters?: Record<string, string>;
      ranges?: {
        anioCompraMin?: number;
        anioCompraMax?: number;
        fechaNacimientoFrom?: string;
        fechaNacimientoTo?: string;
      };
    },
  ) {
    const page = Number(body.page ?? 1);
    const limit = Number(body.limit ?? 20);
    const sortBy: keyof Cliente | 'createdAt' | 'updatedAt' =
      body.sortBy ?? 'createdAt';
    const sortOrder = (body.sortOrder as 'asc' | 'desc') ?? 'desc';
    const q = body.q;
    const filters = body.filters ?? {};
    const ranges = body.ranges ?? {};
    return this.clientesService.search({
      q,
      page,
      limit,
      sortBy,
      sortOrder,
      filters,
      ranges,
    });
  }

  @Get('count/all')
  count(
    @Query()
    query: Record<string, string>,
  ) {
    const q = query.q;
    const filters = {
      provincia: query.provincia,
      localidad: query.localidad,
      tipoVehiculo: query.tipoVehiculo,
      marca: query.marca,
      modelo: query.modelo,
      productoServicio: query.productoServicio,
      nombreCompleto: query.nombreCompleto,
      correoElectronico: query.correoElectronico,
      telefonoCelular: query.telefonoCelular,
      tipoCliente: query.tipoCliente, // NUEVO
      observaciones: query.observaciones, // NUEVO
    };
    const ranges = {
      anioCompraMin: query.anioCompraMin
        ? Number(query.anioCompraMin)
        : undefined,
      anioCompraMax: query.anioCompraMax
        ? Number(query.anioCompraMax)
        : undefined,
      fechaNacimientoFrom: query.fechaNacimientoFrom,
      fechaNacimientoTo: query.fechaNacimientoTo,
    };
    return this.clientesService.count({ q, filters, ranges });
  }

  @Get('stats')
  stats(
    @Query('groupBy') groupByRaw: string,
    @Query() query: Record<string, string>,
  ) {
    const groupBy = (groupByRaw ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const q = query.q;
    const filters = {
      provincia: query.provincia,
      localidad: query.localidad,
      tipoVehiculo: query.tipoVehiculo,
      marca: query.marca,
      modelo: query.modelo,
      productoServicio: query.productoServicio,
      nombreCompleto: query.nombreCompleto,
      correoElectronico: query.correoElectronico,
      telefonoCelular: query.telefonoCelular,
      tipoCliente: query.tipoCliente, // NUEVO
      observaciones: query.observaciones, // NUEVO
    };
    const ranges = {
      anioCompraMin: query.anioCompraMin
        ? Number(query.anioCompraMin)
        : undefined,
      anioCompraMax: query.anioCompraMax
        ? Number(query.anioCompraMax)
        : undefined,
      fechaNacimientoFrom: query.fechaNacimientoFrom,
      fechaNacimientoTo: query.fechaNacimientoTo,
    };
    const limit = query.limit ? Number(query.limit) : 50;
    return this.clientesService.stats({ groupBy, q, filters, ranges, limit });
  }

  @Get('suggestions')
  suggestions(
    @Query('field') field: string,
    @Query('query') text: string,
    @Query('limit') limit?: string,
  ) {
    return this.clientesService.suggestions(
      field,
      text ?? '',
      limit ? Number(limit) : 10,
    );
  }

  @Get('export-excel')
  async exportToExcel(@Query() query: Record<string, string>, @Res() res: any) {
    try {
      // Extraer los mismos filtros que usas en tu método findAll
      const q = query.q;
      const filters = {
        provincia: query.provincia,
        localidad: query.localidad,
        tipoVehiculo: query.tipoVehiculo,
        marca: query.marca,
        modelo: query.modelo,
        productoServicio: query.productoServicio,
        nombreCompleto: query.nombreCompleto,
        correoElectronico: query.correoElectronico,
        telefonoCelular: query.telefonoCelular,
        tipoCliente: query.tipoCliente, // NUEVO
        observaciones: query.observaciones, // NUEVO
      };
      const ranges = {
        anioCompraMin: query.anioCompraMin
          ? Number(query.anioCompraMin)
          : undefined,
        anioCompraMax: query.anioCompraMax
          ? Number(query.anioCompraMax)
          : undefined,
        fechaNacimientoFrom: query.fechaNacimientoFrom,
        fechaNacimientoTo: query.fechaNacimientoTo,
      };

      // Llamar al método de exportación del servicio
      const excelBuffer = await this.clientesService.exportToExcel({
        q,
        filters,
        ranges,
      });

      // Generar nombre del archivo con timestamp
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[T:]/g, '-');
      const filename = `clientes-${timestamp}.xlsx`;

      // Configurar headers para la descarga
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('Content-Length', excelBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');

      // Enviar el archivo
      res.send(excelBuffer);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      res.status(500).json({
        message: 'Error interno del servidor al exportar Excel',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }

  @Post('export-excel')
  async exportToExcelPost(
    @Body()
    body: {
      q?: string;
      filters?: {
        provincia?: string;
        localidad?: string;
        tipoVehiculo?: string;
        marca?: string;
        modelo?: string;
        productoServicio?: string;
        nombreCompleto?: string;
        correoElectronico?: string;
        telefonoCelular?: string;
        tipoCliente?: string; // NUEVO
        observaciones?: string; // NUEVO
      };
      ranges?: {
        anioCompraMin?: number;
        anioCompraMax?: number;
        fechaNacimientoFrom?: string;
        fechaNacimientoTo?: string;
      };
    },
    @Res() res: any,
  ) {
    try {
      const { q, filters = {}, ranges = {} } = body;

      // Llamar al método de exportación del servicio
      const excelBuffer = await this.clientesService.exportToExcel({
        q,
        filters,
        ranges,
      });

      // Generar nombre del archivo con timestamp
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[T:]/g, '-');
      const filename = `clientes-filtrados-${timestamp}.xlsx`;

      // Configurar headers para la descarga
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      res.setHeader('Content-Length', excelBuffer.length);
      res.setHeader('Cache-Control', 'no-cache');

      // Enviar el archivo
      res.send(excelBuffer);
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      res.status(500).json({
        message: 'Error interno del servidor al exportar Excel',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }

  @Post('search/observaciones')
  async searchObservaciones(
    @Body()
    body: {
      keywords: string[];
      searchType?: 'exact' | 'fuzzy' | 'any';
      page?: number;
      limit?: number;
      sortBy?: keyof Cliente | 'createdAt' | 'updatedAt';
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const {
      keywords,
      searchType = 'any',
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = body;

    return this.clientesService.searchObservaciones({
      keywords,
      searchType,
      page,
      limit,
      sortBy,
      sortOrder,
    });
  }

  @Get('cumpleanos/hoy')
  async getCumpleanosHoy() {
    return this.clientesService.getCumpleanosHoy();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientesService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  async update(
    @Param('id') id: string,
    @Body() updateClienteDto: UpdateClienteDto,
  ): Promise<{ message: string; cliente: ClienteDocument }> {
    const cliente = await this.clientesService.update(id, updateClienteDto);

    return {
      message: 'Cliente actualizado correctamente',
      cliente,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
  ): Promise<{ message: string; cliente?: ClienteDocument }> {
    return await this.clientesService.remove(id);
  }
}
