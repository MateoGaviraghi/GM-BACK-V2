import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { type FilterQuery, type PipelineStage, type Model } from 'mongoose';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { Cliente, ClienteDocument } from './entities/cliente.entity';

import * as ExcelJS from 'exceljs';

@Injectable()
export class ClientesService {
  constructor(
    @InjectModel(Cliente.name)
    private readonly clienteModel: Model<ClienteDocument>,
  ) {}

  async create(createClienteDto: CreateClienteDto) {
    // Mongoose convertirá strings ISO a Date según el esquema
    const created = await this.clienteModel.create(createClienteDto);
    return created;
  }

  findAll() {
    return this.clienteModel.find().exec();
  }

  findOne(id: string) {
    return this.clienteModel.findById(id).exec();
  }

  async update(
    id: string,
    updateClienteDto: UpdateClienteDto,
  ): Promise<ClienteDocument> {
    try {
      // Validar que el ID sea un ObjectId válido
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de cliente inválido');
      }

      const updatedCliente = await this.clienteModel
        .findByIdAndUpdate(id, updateClienteDto, {
          new: true, // Retorna el documento actualizado
          runValidators: true, // Ejecuta las validaciones del schema
        })
        .exec();

      if (!updatedCliente) {
        throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
      }

      return updatedCliente;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al actualizar el cliente');
    }
  }

  async remove(
    id: string,
  ): Promise<{ message: string; cliente?: ClienteDocument }> {
    try {
      // Validar que el ID sea un ObjectId válido
      if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        throw new BadRequestException('ID de cliente inválido');
      }

      // Verificar que el cliente existe antes de eliminar
      const cliente = await this.clienteModel.findById(id).exec();
      if (!cliente) {
        throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
      }

      // Eliminar el cliente
      await this.clienteModel.findByIdAndDelete(id).exec();

      return {
        message: `Cliente "${cliente.nombreCompleto || 'Sin nombre'}" eliminado correctamente`,
        cliente: cliente,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Error al eliminar el cliente');
    }
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, ''); // Elimina los acentos
  }

  private createAccentInsensitiveRegex(searchTerm: string): RegExp {
    // Normalizar el término de búsqueda
    const normalized = this.normalizeText(searchTerm);

    // Escapar caracteres especiales de regex
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Crear el patrón con variaciones de acentos
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

  // Tu método search MODIFICADO
  async search(params: {
    q?: string;
    page?: number;
    limit?: number;
    sortBy?: keyof Cliente | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
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
  }): Promise<{
    items: ClienteDocument[];
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

    const applyFilters = (
      qy: import('mongoose').Query<any, ClienteDocument>,
    ) => {
      // BÚSQUEDA GENERAL MEJORADA - Reemplaza tu código anterior
      if (q && q.trim()) {
        const searchRegex = this.createAccentInsensitiveRegex(q.trim());
        qy = qy.where({
          $or: [
            { nombreCompleto: { $regex: searchRegex } },
            { correoElectronico: { $regex: searchRegex } },
            { telefonoCelular: { $regex: searchRegex } },
            { provincia: { $regex: searchRegex } },
            { localidad: { $regex: searchRegex } },
            { tipoVehiculo: { $regex: searchRegex } },
            { marca: { $regex: searchRegex } },
            { modelo: { $regex: searchRegex } },
            { productoServicio: { $regex: searchRegex } },
            { tipoCliente: { $regex: searchRegex } }, // NUEVO
            { observaciones: { $regex: searchRegex } }, // NUEVO
          ],
        });
      }

      // FILTROS ESPECÍFICOS MEJORADOS - Reemplaza todos tus .equals()
      if (filters) {
        if (filters.provincia) {
          const regex = this.createAccentInsensitiveRegex(filters.provincia);
          qy = qy.where('provincia').regex(regex);
        }
        if (filters.localidad) {
          const regex = this.createAccentInsensitiveRegex(filters.localidad);
          qy = qy.where('localidad').regex(regex);
        }
        if (filters.tipoVehiculo) {
          const regex = this.createAccentInsensitiveRegex(filters.tipoVehiculo);
          qy = qy.where('tipoVehiculo').regex(regex);
        }
        if (filters.marca) {
          const regex = this.createAccentInsensitiveRegex(filters.marca);
          qy = qy.where('marca').regex(regex);
        }
        if (filters.modelo) {
          const regex = this.createAccentInsensitiveRegex(filters.modelo);
          qy = qy.where('modelo').regex(regex);
        }
        if (filters.productoServicio) {
          const regex = this.createAccentInsensitiveRegex(
            filters.productoServicio,
          );
          qy = qy.where('productoServicio').regex(regex);
        }
        if (filters.nombreCompleto) {
          const regex = this.createAccentInsensitiveRegex(
            filters.nombreCompleto,
          );
          qy = qy.where('nombreCompleto').regex(regex);
        }
        if (filters.correoElectronico) {
          // Para email, solo insensible a mayúsculas (no necesita acentos)
          qy = qy
            .where('correoElectronico')
            .regex(new RegExp(filters.correoElectronico, 'i'));
        }
        if (filters.telefonoCelular) {
          // Para teléfono, ignorar espacios y guiones
          const cleanPhone = filters.telefonoCelular.replace(/[\s-]/g, '');
          qy = qy.where('telefonoCelular').regex(new RegExp(cleanPhone, 'i'));
        }

        if (filters.tipoCliente) {
          const regex = this.createAccentInsensitiveRegex(filters.tipoCliente);
          qy = qy.where('tipoCliente').regex(regex);
        }
        if (filters.observaciones) {
          const regex = this.createAccentInsensitiveRegex(
            filters.observaciones,
          );
          qy = qy.where('observaciones').regex(regex);
        }
      }

      // RANGOS - Sin cambios
      const {
        anioCompraMin,
        anioCompraMax,
        fechaNacimientoFrom,
        fechaNacimientoTo,
      } = ranges;
      if (anioCompraMin !== undefined) {
        qy = qy.where('anioCompra').gte(anioCompraMin);
      }
      if (anioCompraMax !== undefined) {
        qy = qy.where('anioCompra').lte(anioCompraMax);
      }
      if (fechaNacimientoFrom)
        qy = qy
          .where('fechaNacimiento')
          .gte(new Date(fechaNacimientoFrom).getTime());
      if (fechaNacimientoTo)
        qy = qy
          .where('fechaNacimiento')
          .lte(new Date(fechaNacimientoTo).getTime());
      return qy;
    };

    const skip = Math.max(0, (page - 1) * limit);
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Agregar _id como ordenamiento secundario para garantizar consistencia
    // Esto evita que registros con el mismo valor en el campo principal
    // aparezcan en orden diferente entre consultas de paginación
    if (sortBy !== ('_id' as any)) {
      sort['_id'] = sortOrder === 'asc' ? 1 : -1;
    }

    const listQuery = applyFilters(this.clienteModel.find())
      .sort(sort)
      .skip(skip)
      .limit(limit); // Sin límite máximo para permitir exportación completa

    const countQuery = applyFilters(this.clienteModel.countDocuments());

    const items = (await listQuery.exec()) as ClienteDocument[];
    const total = (await countQuery.exec()) as number;

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
    };
  }

  count(
    params: Omit<
      Parameters<ClientesService['search']>[0],
      'page' | 'limit' | 'sortBy' | 'sortOrder'
    >,
  ): Promise<number> {
    return this.search({ ...params, page: 1, limit: 1 }).then((r) => r.total);
  }

  async stats(params: {
    groupBy: string[];
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
    limit?: number;
  }): Promise<
    Array<{ group: Record<string, string | number | null>; count: number }>
  > {
    const { groupBy, q, filters = {}, ranges = {}, limit = 50 } = params;
    const allowed = new Set([
      'provincia',
      'localidad',
      'tipoVehiculo',
      'marca',
      'modelo',
      'productoServicio',
      'anioCompra',
      'tipoCliente', // NUEVO
    ]);
    const groups = groupBy.filter((g) => allowed.has(g));
    if (groups.length === 0) {
      return [];
    }

    const match: FilterQuery<ClienteDocument> = {};
    if (q && q.trim()) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (match as any).$text = { $search: q.trim() };
    }
    if (filters) {
      if (filters.provincia) match.provincia = filters.provincia;
      if (filters.localidad) match.localidad = filters.localidad;
      if (filters.tipoVehiculo) match.tipoVehiculo = filters.tipoVehiculo;
      if (filters.marca) match.marca = filters.marca;
      if (filters.modelo) match.modelo = filters.modelo;
      if (filters.productoServicio)
        match.productoServicio = filters.productoServicio;
      if (filters.nombreCompleto) match.nombreCompleto = filters.nombreCompleto;
      if (filters.correoElectronico)
        match.correoElectronico = filters.correoElectronico;
      if (filters.telefonoCelular)
        match.telefonoCelular = filters.telefonoCelular;
      if (filters.tipoCliente) match.tipoCliente = filters.tipoCliente;
      if (filters.observaciones) match.observaciones = filters.observaciones;
    }
    const {
      anioCompraMin,
      anioCompraMax,
      fechaNacimientoFrom,
      fechaNacimientoTo,
    } = ranges;
    if (anioCompraMin !== undefined || anioCompraMax !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (match as any).anioCompra = {};
      if (anioCompraMin !== undefined)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (match as any).anioCompra.$gte = anioCompraMin;
      if (anioCompraMax !== undefined)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (match as any).anioCompra.$lte = anioCompraMax;
    }
    if (fechaNacimientoFrom || fechaNacimientoTo) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (match as any).fechaNacimiento = {};
      if (fechaNacimientoFrom)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (match as any).fechaNacimiento.$gte = new Date(fechaNacimientoFrom);
      if (fechaNacimientoTo)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        (match as any).fechaNacimiento.$lte = new Date(fechaNacimientoTo);
    }

    const groupId: Record<string, unknown> = {};
    for (const g of groups) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (groupId as any)[g] = `$${g}`;
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $group: {
          _id: groupId,
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: Math.min(Math.max(1, limit), 1000) },
      { $project: { _id: 0, group: '$_id', count: 1 } },
    ];

    const results = await this.clienteModel
      .aggregate<{
        group: Record<string, string | number | null>;
        count: number;
      }>(pipeline)
      .exec();
    return results;
  }

  async suggestions(field: string, queryText: string, limit = 10) {
    // Normalizar el texto de búsqueda (eliminar acentos y convertir a minúsculas)
    const normalizeText = (text: string): string => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Elimina los acentos
    };

    const normalizedQuery = normalizeText(queryText);

    const items = await this.clienteModel
      .find({} as FilterQuery<ClienteDocument>)
      .select({ [field]: 1 })
      .lean()
      .exec();

    const values = (items as Array<Record<string, unknown>>)
      .map((d) => d[field] as string)
      .filter(Boolean)
      .filter((value) => {
        const normalizedValue = normalizeText(value);
        return normalizedValue.startsWith(normalizedQuery);
      })
      .slice(0, Math.min(limit, 20));

    return Array.from(new Set(values));
  }

  async exportToExcel(params: {
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
  }): Promise<Buffer> {
    // ✅ USAR EL MISMO MÉTODO SEARCH QUE YA TIENES
    // Esto ya incluye toda tu lógica de búsqueda insensible a acentos/mayúsculas
    const searchResult = await this.search({
      ...params,
      page: 1,
      limit: 100000, // Límite alto para obtener todos los registros
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    const clientes = searchResult.items;

    // Crear un nuevo workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Clientes', {
      properties: { tabColor: { argb: '366092' } },
    });

    // Configurar metadatos del workbook
    workbook.creator = 'Sistema de Gestión de Clientes';
    workbook.created = new Date();

    // Definir las columnas con anchos optimizados
    worksheet.columns = [
      { header: 'Nombre Completo', key: 'nombreCompleto', width: 25 },
      { header: 'Fecha Nacimiento', key: 'fechaNacimiento', width: 18 },
      { header: 'Provincia', key: 'provincia', width: 16 },
      { header: 'Localidad', key: 'localidad', width: 16 },
      { header: 'Dirección', key: 'direccion', width: 30 },
      { header: 'Tel. Celular', key: 'telefonoCelular', width: 15 },
      { header: 'Tel. Fijo', key: 'telefonoFijo', width: 15 },
      { header: 'Email', key: 'correoElectronico', width: 25 },
      { header: 'Tipo Vehículo', key: 'tipoVehiculo', width: 16 },
      { header: 'Producto/Servicio', key: 'productoServicio', width: 20 },
      { header: 'Marca', key: 'marca', width: 12 },
      { header: 'Modelo', key: 'modelo', width: 15 },
      { header: 'Año Compra', key: 'anioCompra', width: 12 },
      { header: 'Tipo Cliente', key: 'tipoCliente', width: 15 }, // NUEVO
      { header: 'Observaciones', key: 'observaciones', width: 35 }, // NUEVO
      { header: 'Fecha Creación', key: 'createdAt', width: 16 },
    ];

    // ESTILIZAR EL HEADER
    const headerRow = worksheet.getRow(1);
    headerRow.height = 30; // Altura del header

    headerRow.eachCell((cell) => {
      cell.font = {
        bold: true,
        color: { argb: 'FFFFFF' },
        size: 11,
        name: 'Calibri',
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '366092' }, // Azul corporativo
      };
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'medium', color: { argb: '1f4e79' } },
        left: { style: 'medium', color: { argb: '1f4e79' } },
        bottom: { style: 'medium', color: { argb: '1f4e79' } },
        right: { style: 'medium', color: { argb: '1f4e79' } },
      };
    });

    // AGREGAR LOS DATOS CON FORMATO
    clientes.forEach((cliente, index) => {
      const row = worksheet.addRow({
        nombreCompleto: cliente.nombreCompleto || '',
        fechaNacimiento: cliente.fechaNacimiento
          ? new Date(cliente.fechaNacimiento).toLocaleDateString('es-ES')
          : '',
        provincia: cliente.provincia || '',
        localidad: cliente.localidad || '',
        direccion: cliente.direccion || '',
        telefonoCelular: cliente.telefonoCelular || '',
        telefonoFijo: cliente.telefonoFijo || '',
        correoElectronico: cliente.correoElectronico || '',
        tipoVehiculo: cliente.tipoVehiculo || '',
        productoServicio: cliente.productoServicio || '',
        marca: cliente.marca || '',
        modelo: cliente.modelo || '',
        anioCompra: cliente.anioCompra || '',
        tipoCliente: cliente.tipoCliente || '', // NUEVO
        observaciones: cliente.observaciones || '', // NUEVO
        createdAt: cliente.createdAt
          ? new Date(cliente.createdAt).toLocaleDateString('es-ES')
          : '',
      });

      // Altura de las filas de datos
      row.height = 20;

      // ESTILIZAR CADA CELDA DE DATOS
      row.eachCell((cell, colNumber) => {
        // Color alternado de filas para mejor legibilidad
        const isEvenRow = (index + 2) % 2 === 0; // +2 porque index empieza en 0 y tenemos header

        cell.font = {
          size: 10,
          name: 'Calibri',
          color: { argb: '333333' },
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: isEvenRow ? 'F8F9FA' : 'FFFFFF' }, // Gris muy claro alternado
        };

        cell.alignment = {
          vertical: 'middle',
          horizontal: colNumber <= 2 ? 'left' : 'left', // Nombres a la izquierda
          wrapText: false,
        };

        // Bordes sutiles
        cell.border = {
          top: { style: 'thin', color: { argb: 'E1E5E9' } },
          left: { style: 'thin', color: { argb: 'E1E5E9' } },
          bottom: { style: 'thin', color: { argb: 'E1E5E9' } },
          right: { style: 'thin', color: { argb: 'E1E5E9' } },
        };

        // Formateo específico por tipo de columna
        if (colNumber === 8) {
          // Email
          cell.font = { ...cell.font, color: { argb: '0066CC' } }; // Azul para emails
        }
        if (colNumber === 6 || colNumber === 7) {
          // Teléfonos
          cell.font = { ...cell.font, color: { argb: '2D7D2D' } }; // Verde para teléfonos
        }
        if (colNumber === 13) {
          // Año compra
          cell.alignment = { ...cell.alignment, horizontal: 'center' };
        }
      });
    });

    // AGREGAR FILTROS AUTOMÁTICOS
    worksheet.autoFilter = {
      from: 'A1',
      to: `P${clientes.length + 1}`, // P es la nueva última columna
    };

    // CONGELAR LA FILA DEL HEADER
    worksheet.views = [
      {
        state: 'frozen',
        ySplit: 1, // Congelar primera fila
        xSplit: 0,
        topLeftCell: 'A2',
        activeCell: 'A2',
      },
    ];

    // AGREGAR FILA DE RESUMEN CON ESTILO
    if (clientes.length > 0) {
      const summaryRowNumber = clientes.length + 3; // Dejar una fila vacía
      const summaryRow = worksheet.getRow(summaryRowNumber);

      summaryRow.getCell(1).value = `📊 Total de clientes: ${clientes.length}`;
      summaryRow.getCell(1).font = {
        bold: true,
        color: { argb: '366092' },
        size: 12,
      };
      summaryRow.getCell(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'E8F4FD' },
      };

      // Fecha y hora de exportación
      const dateRow = worksheet.getRow(summaryRowNumber + 1);
      dateRow.getCell(1).value =
        `🕒 Exportado el: ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}`;
      dateRow.getCell(1).font = {
        italic: true,
        color: { argb: '666666' },
        size: 10,
      };
    }

    // AJUSTAR ZOOM PARA MEJOR VISUALIZACIÓN
    worksheet.views = [
      {
        ...worksheet.views[0],
        zoomScale: 90, // 90% de zoom para ver más contenido
      },
    ];

    // Generar el buffer del archivo Excel
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async searchObservaciones(params: {
    keywords: string[];
    searchType: 'exact' | 'fuzzy' | 'any';
    page?: number;
    limit?: number;
    sortBy?: keyof Cliente | 'createdAt' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    items: ClienteDocument[];
    total: number;
    page: number;
    limit: number;
    pages: number;
    matchedKeywords: string[];
  }> {
    const {
      keywords,
      searchType,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    // Normalizar keywords
    const normalizedKeywords = keywords
      .map((k) => this.normalizeText(k.trim()))
      .filter(Boolean);

    if (normalizedKeywords.length === 0) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        pages: 0,
        matchedKeywords: [],
      };
    }

    let query = this.clienteModel.find();

    // Construir la búsqueda según el tipo
    if (searchType === 'exact') {
      // Búsqueda exacta: debe contener TODAS las keywords
      const regexArray = normalizedKeywords.map((keyword) =>
        this.createAccentInsensitiveRegex(keyword),
      );
      query = query.where({
        $and: regexArray.map((regex) => ({
          observaciones: { $regex: regex },
        })),
      });
    } else if (searchType === 'fuzzy') {
      // Búsqueda difusa: palabras parciales o con errores
      const fuzzyPatterns = normalizedKeywords.map((keyword) => {
        // Crear patrón más flexible: cada letra puede ser opcional
        const flexiblePattern = keyword
          .split('')
          .map((char) => `${char}?`)
          .join('.*?');
        return new RegExp(flexiblePattern, 'i');
      });

      query = query.where({
        $or: fuzzyPatterns.map((pattern) => ({
          observaciones: { $regex: pattern },
        })),
      });
    } else {
      // Búsqueda 'any': debe contener AL MENOS una keyword
      const regexArray = normalizedKeywords.map((keyword) =>
        this.createAccentInsensitiveRegex(keyword),
      );
      query = query.where({
        $or: regexArray.map((regex) => ({
          observaciones: { $regex: regex },
        })),
      });
    }

    // Solo buscar clientes que tengan observaciones
    query = query.where('observaciones').ne(null).ne('');

    // Aplicar paginación y ordenamiento
    const skip = Math.max(0, (page - 1) * limit);
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const listQuery = query
      .clone()
      .sort(sort)
      .skip(skip)
      .limit(Math.min(limit, 100));
    const countQuery = query.clone().countDocuments();

    const items = (await listQuery.exec()) as ClienteDocument[];
    const total = await countQuery.exec();

    // Encontrar qué keywords coincidieron realmente
    const matchedKeywords: string[] = [];
    items.forEach((item) => {
      if (item.observaciones) {
        const normalizedObs = this.normalizeText(item.observaciones);
        normalizedKeywords.forEach((keyword) => {
          if (
            normalizedObs.includes(keyword) &&
            !matchedKeywords.includes(keyword)
          ) {
            matchedKeywords.push(keyword);
          }
        });
      }
    });

    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 1,
      matchedKeywords,
    };
  }

  async getCumpleanosHoy(): Promise<ClienteDocument[]> {
    // Obtener fecha actual
    const hoy = new Date();
    const diaHoy = hoy.getDate();
    const mesHoy = hoy.getMonth() + 1; // getMonth() devuelve 0-11

    console.log(`🔍 Buscando cumpleaños para: ${diaHoy}/${mesHoy}`);

    // Usar agregación de MongoDB para comparar día y mes directamente
    const cumpleanosHoy = await this.clienteModel.aggregate([
      {
        $match: {
          fechaNacimiento: { $exists: true, $ne: null },
        },
      },
      {
        $addFields: {
          diaNacimiento: { $dayOfMonth: '$fechaNacimiento' },
          mesNacimiento: { $month: '$fechaNacimiento' },
        },
      },
      {
        $match: {
          diaNacimiento: diaHoy,
          mesNacimiento: mesHoy,
        },
      },
      {
        $project: {
          nombreCompleto: 1,
          fechaNacimiento: 1,
          telefonoCelular: 1,
          correoElectronico: 1,
        },
      },
    ]);

    console.log(`🎂 Cumpleaños encontrados:`, cumpleanosHoy);

    return cumpleanosHoy as ClienteDocument[];
  }
}
