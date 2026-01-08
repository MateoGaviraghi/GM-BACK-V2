import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import { UsadosService } from './usados.service';
import type { Usado } from './entities/usado.entity';
import type { Response } from 'express';

@Controller('usados/public')
export class UsadosPublicController {
  constructor(private readonly usadosService: UsadosService) {}

  @Get()
  findAllPublic(@Query() query: Record<string, string>) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const sortBy =
      (query.sortBy as keyof Usado | 'createdAt' | 'updatedAt') ?? 'createdAt';
    const sortOrder = (query.sortOrder as 'asc' | 'desc') ?? 'desc';

    const filters = {
      marca: query.marca,
      modelo: query.modelo,
      estado: 'Disponible',
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

  @Get('search')
  searchPublic(@Query() query: Record<string, string>) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const sortBy =
      (query.sortBy as keyof Usado | 'createdAt' | 'updatedAt') ?? 'createdAt';
    const sortOrder = (query.sortOrder as 'asc' | 'desc') ?? 'desc';
    const q = query.q;

    const filters = {
      marca: query.marca,
      modelo: query.modelo,
      estado: 'Disponible',
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
  getUsadoOptionsPublic() {
    return this.usadosService.getUsadoOptions();
  }

  @Get('suggestions')
  suggestionsPublic(
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
  findOnePublic(@Param('id') id: string) {
    return this.usadosService.findOne(id);
  }

  @Get(':id/ficha-tecnica')
  async getFichaTecnica(@Param('id') id: string, @Res() res: Response) {
    const usado = await this.usadosService.findOne(id);
    const path = await import('path');
    const fs = await import('fs');

    const filename =
      `${usado.titulo || 'Usado'}`
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '_') + '.pdf';

    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    res.setHeader('Content-Type', 'application/pdf');
    // inline = abrir en navegador, attachment = descargar
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    doc.pipe(res);

    const colors = {
      cyan: '#0891b2',
      darkSlate: '#0f172a',
      lightSlate: '#f8fafc',
      white: '#ffffff',
      green: '#10b981',
    };

    const logoPath = path.join(
      process.cwd(),
      'src',
      'images',
      'Logos-folletos',
      'logoGM-Photoroom.png',
    );
    const letrasPath = path.join(
      process.cwd(),
      'src',
      'images',
      'Logos-folletos',
      'letrasGuzmanMotors-Photoroom.png',
    );

    // ==================== PÁGINA 1: PORTADA ====================
    // Fondo azul oscuro completo
    doc.rect(0, 0, 595, 842).fill(colors.darkSlate);

    // Header con logo de letras grande centrado
    if (fs.existsSync(letrasPath)) {
      doc.image(letrasPath, 190, 35, { width: 215 });
    }

    // Título del vehículo - estilo moderno y elegante
    doc
      .fontSize(28)
      .font('Helvetica')
      .fillColor(colors.white)
      .text(usado.titulo?.toUpperCase() || 'VEHÍCULO USADO', 50, 180, {
        width: 495,
        characterSpacing: 4,
        lineGap: 8,
      });

    // Subtítulo con información
    const subtitulo = [
      usado.marca,
      usado.modelo,
      usado.version,
      usado.anio ? new Date(usado.anio).getFullYear().toString() : null,
    ]
      .filter((x) => x)
      .join(' | ');

    doc
      .fontSize(14)
      .font('Helvetica')
      .fillColor(colors.cyan)
      .text(subtitulo, 50, doc.y + 15);

    // Imagen principal grande y centrada - Usar foto sin fondo si existe
    const mainImageUrl =
      usado.fotoSinFondo1?.secure_url || usado.imagenes?.[0]?.secure_url;

    if (mainImageUrl) {
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get(mainImageUrl, {
          responseType: 'arraybuffer',
        });
        const imageBuffer = Buffer.from(response.data);
        doc.image(imageBuffer, 50, 310, { width: 495, height: 350 });
      } catch (error) {
        console.error('Error loading main image:', error);
      }
    }

    // Footer de página 1
    doc
      .moveTo(50, 760)
      .lineTo(545, 760)
      .strokeColor(colors.cyan)
      .lineWidth(2)
      .stroke();

    // Logo G pequeño en footer
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 765, { width: 35 });
    }

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(colors.white)
      .text('Teléfono', 100, 770);
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(colors.lightSlate)
      .text('+54 9 342 421 6850', 100, 783);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(colors.white)
      .text('Visitanos', 250, 770);
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(colors.lightSlate)
      .text('Av. Blas Parera 6422', 250, 783);
    doc.text('Santa Fe, Argentina', 250, 795);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(colors.white)
      .text('Horarios', 450, 770);
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(colors.lightSlate)
      .text('Lun - Vie: 09:30 - 18:30', 450, 783);

    // ==================== PÁGINA 2: CARACTERÍSTICAS TÉCNICAS ====================
    doc.addPage();

    // Fondo azul oscuro
    doc.rect(0, 0, 595, 842).fill(colors.darkSlate);

    // Header - Solo logo de letras grande y título de sección
    if (fs.existsSync(letrasPath)) {
      doc.image(letrasPath, 190, 35, { width: 215 });
    }

    let y = 135;

    // Título de sección
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .fillColor(colors.cyan)
      .text('CARACTERÍSTICAS TÉCNICAS', 50, y);

    y += 35;

    // Crear tabla con fondo gris claro
    const tableStartY = y;
    const cellHeight = 22;
    const col1Width = 220;
    const col2Width = 275;

    // Función helper para añadir fila a la tabla
    const addTableRow = (label: string, value: string, isHeader = false) => {
      // Alternar colores de fila
      const rowColor = isHeader
        ? '#1e293b'
        : y % 2 === 0
          ? '#334155'
          : '#1e293b';
      doc.rect(50, y, col1Width + col2Width, cellHeight).fill(rowColor);

      const textColor = isHeader ? colors.cyan : colors.white;
      const labelColor = isHeader ? colors.cyan : colors.lightSlate;

      doc
        .fontSize(isHeader ? 12 : 10)
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica-Bold')
        .fillColor(labelColor)
        .text(label, 60, y + 6, { width: col1Width - 20 });

      doc
        .fontSize(isHeader ? 12 : 10)
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(textColor)
        .text(value, 50 + col1Width + 10, y + 6, { width: col2Width - 20 });

      y += cellHeight;
    };

    // Datos generales
    if (usado.tipoVehiculo) addTableRow('Tipo de Vehículo', usado.tipoVehiculo);
    if (usado.anio)
      addTableRow('Año', new Date(usado.anio).getFullYear().toString());
    if (usado.version) addTableRow('Versión', usado.version);
    if (usado.color) addTableRow('Color', usado.color);
    if (usado.kilometraje)
      addTableRow('Kilometraje', `${usado.kilometraje.toLocaleString()} km`);
    if (usado.tipoCombustible)
      addTableRow('Combustible', usado.tipoCombustible);
    if (usado.transmision) addTableRow('Transmisión', usado.transmision);
    if (usado.traccion) addTableRow('Tracción', usado.traccion);

    // MOTOR
    if (usado.cilindrada || usado.potencia) {
      y += 10;
      addTableRow('MOTOR', '', true);

      if (usado.cilindrada) addTableRow('Cilindrada', `${usado.cilindrada} cc`);
      if (usado.potencia) addTableRow('Potencia', `${usado.potencia} HP`);
    }

    // DIMENSIONES Y CAPACIDAD
    if (usado.cantidadPuertas || usado.cantidadAsientos) {
      y += 10;
      addTableRow('CAPACIDAD', '', true);

      if (usado.cantidadPuertas)
        addTableRow('Cantidad de Puertas', String(usado.cantidadPuertas));
      if (usado.cantidadAsientos)
        addTableRow('Cantidad de Asientos', String(usado.cantidadAsientos));
    }

    // ESTADO
    if (usado.estado) {
      y += 10;
      addTableRow('ESTADO', '', true);

      if (usado.estado) addTableRow('Estado', usado.estado);
    }

    // Segunda imagen en la página 2 (si hay espacio)
    if (usado.imagenes && usado.imagenes.length > 1 && y < 520) {
      y += 20;
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get(usado.imagenes[1].secure_url, {
          responseType: 'arraybuffer',
        });
        const imageBuffer = Buffer.from(response.data);
        doc.image(imageBuffer, 50, y, { width: 495, height: 180 });
      } catch (error) {
        console.error('Error loading second image:', error);
      }
    }

    // Footer página 2
    doc
      .moveTo(50, 760)
      .lineTo(545, 760)
      .strokeColor(colors.cyan)
      .lineWidth(2)
      .stroke();

    // Logo G pequeño en footer
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 765, { width: 35 });
    }

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(colors.white)
      .text('Teléfono', 100, 770);
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(colors.lightSlate)
      .text('+54 9 342 421 6850', 100, 783);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(colors.white)
      .text('Visitanos', 250, 770);
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(colors.lightSlate)
      .text('Av. Blas Parera 6422', 250, 783);
    doc.text('Santa Fe, Argentina', 250, 795);

    doc
      .fontSize(9)
      .font('Helvetica-Bold')
      .fillColor(colors.white)
      .text('Horarios', 450, 770);
    doc
      .fontSize(8)
      .font('Helvetica')
      .fillColor(colors.lightSlate)
      .text('Lun - Vie: 09:30 - 18:30', 450, 783);

    // ==================== PÁGINA 3: EQUIPAMIENTO (si hay) ====================
    if (usado.equipamiento?.length) {
      doc.addPage();

      // Fondo azul oscuro
      doc.rect(0, 0, 595, 842).fill(colors.darkSlate);

      // Header - Solo logo de letras grande
      if (fs.existsSync(letrasPath)) {
        doc.image(letrasPath, 190, 35, { width: 215 });
      }

      y = 135;

      // Título
      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .fillColor(colors.cyan)
        .text('EQUIPAMIENTO', 50, y);

      y += 30;

      // Dividir equipamiento en dos columnas
      const col1X = 50;
      const col2X = 315;
      const colWidth = 230;
      const middleIndex = Math.ceil(usado.equipamiento.length / 2);

      let y1 = y;
      let y2 = y;

      usado.equipamiento.forEach((item, index) => {
        if (index < middleIndex) {
          // Columna 1
          if (y1 > 380) return; // Dejar más espacio para imagen

          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor(colors.lightSlate)
            .text('•', col1X, y1)
            .text(item, col1X + 15, y1, { width: colWidth - 15 });

          y1 += 16;
        } else {
          // Columna 2
          if (y2 > 380) return;

          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor(colors.lightSlate)
            .text('•', col2X, y2)
            .text(item, col2X + 15, y2, { width: colWidth - 15 });

          y2 += 16;
        }
      });

      // Agregar segunda/tercera imagen en el espacio inferior - Usar foto sin fondo si existe
      const thirdPageImageUrl =
        usado.fotoSinFondo2?.secure_url ||
        usado.imagenes?.[usado.imagenes.length > 2 ? 2 : 1]?.secure_url;

      if (thirdPageImageUrl) {
        try {
          const axios = (await import('axios')).default;
          const response = await axios.get(thirdPageImageUrl, {
            responseType: 'arraybuffer',
          });
          const imageBuffer = Buffer.from(response.data);
          // Imagen más arriba y con mejor proporción
          doc.image(imageBuffer, 50, 390, { width: 495, height: 300 });
        } catch (error) {
          console.error('Error loading third page image:', error);
        }
      }

      // Footer página 3
      doc
        .moveTo(50, 760)
        .lineTo(545, 760)
        .strokeColor(colors.cyan)
        .lineWidth(2)
        .stroke();

      // Logo G pequeño en footer
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 765, { width: 35 });
      }

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(colors.white)
        .text('Teléfono', 100, 770);
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(colors.lightSlate)
        .text('+54 9 342 421 6850', 100, 783);

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(colors.white)
        .text('Visitanos', 250, 770);
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(colors.lightSlate)
        .text('Av. Blas Parera 6422', 250, 783);
      doc.text('Santa Fe, Argentina', 250, 795);

      doc
        .fontSize(9)
        .font('Helvetica-Bold')
        .fillColor(colors.white)
        .text('Horarios', 450, 770);
      doc
        .fontSize(8)
        .font('Helvetica')
        .fillColor(colors.lightSlate)
        .text('Lun - Vie: 09:30 - 18:30', 450, 783);
    }

    doc.end();
  }
}
