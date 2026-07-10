import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RemolquesService } from './remolques.service';
import type { Remolque } from './entities/remolque.entity';

@Controller('remolques/public')
export class RemolquesPublicController {
  constructor(private readonly remolquesService: RemolquesService) {}

  @Get()
  findAllPublic(@Query() query: Record<string, string>) {
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const sortBy =
      (query.sortBy as keyof Remolque | 'createdAt' | 'updatedAt') ??
      'createdAt';
    const sortOrder = (query.sortOrder as 'asc' | 'desc') ?? 'desc';

    const filters = {
      marca: query.marca,
      modelo: query.modelo,
      estado: 'Disponible', // Solo mostrar remolques disponibles al público
      condicion: query.condicion,
      categoria: query.categoria,
      tipoCarroceria: query.tipoCarroceria,
      cantidadEjes: query.cantidadEjes ? Number(query.cantidadEjes) : undefined,
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
      taraMin: query.taraMin ? Number(query.taraMin) : undefined,
      taraMax: query.taraMax ? Number(query.taraMax) : undefined,
    };

    return this.remolquesService.findAll({
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
      (query.sortBy as keyof Remolque | 'createdAt' | 'updatedAt') ??
      'createdAt';
    const sortOrder = (query.sortOrder as 'asc' | 'desc') ?? 'desc';
    const q = query.q;

    const filters = {
      marca: query.marca,
      modelo: query.modelo,
      estado: 'Disponible', // Solo mostrar remolques disponibles
      condicion: query.condicion,
      categoria: query.categoria,
      tipoCarroceria: query.tipoCarroceria,
      cantidadEjes: query.cantidadEjes ? Number(query.cantidadEjes) : undefined,
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
      taraMin: query.taraMin ? Number(query.taraMin) : undefined,
      taraMax: query.taraMax ? Number(query.taraMax) : undefined,
    };

    return this.remolquesService.search({
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
  getRemolqueOptionsPublic() {
    return this.remolquesService.getRemolqueOptions();
  }

  @Get('suggestions')
  suggestionsPublic(
    @Query('field') field: string,
    @Query('query') text: string,
    @Query('limit') limit?: string,
  ) {
    return this.remolquesService.suggestions(
      field,
      text ?? '',
      limit ? Number(limit) : 10,
    );
  }

  @Get(':id')
  findOnePublic(@Param('id') id: string) {
    return this.remolquesService.findOne(id);
  }

  @Get(':id/ficha-tecnica')
  async getFichaTecnica(@Param('id') id: string, @Res() res: Response) {
    const remolque = await this.remolquesService.findOne(id);
    const path = await import('path');
    const fs = await import('fs');

    const filename =
      `${remolque.titulo || 'Remolque'}`
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
      bg: '#14171C',
      panel: '#1B2027',
      text: '#ECEEF1',
      secondary: '#AEB6C2',
      muted: '#7E8794',
      petrol: '#6FC0D4',
      hairline: '#2C323B',
    };

    const drawFooter = () => {
      doc
        .moveTo(50, 760)
        .lineTo(545, 760)
        .strokeColor(colors.hairline)
        .lineWidth(0.75)
        .stroke();

      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 50, 765, { width: 35 });
      }

      doc
        .fontSize(7)
        .font('Helvetica-Bold')
        .fillColor(colors.muted)
        .text('TELÉFONO', 100, 770, { characterSpacing: 1.8 });
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor(colors.secondary)
        .text('+54 9 342 421 6850', 100, 781);

      doc
        .fontSize(7)
        .font('Helvetica-Bold')
        .fillColor(colors.muted)
        .text('VISITANOS', 250, 770, { characterSpacing: 1.8 });
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor(colors.secondary)
        .text('Av. Blas Parera 6422', 250, 781);
      doc.text('Santa Fe, Argentina', 250, 792);

      doc
        .fontSize(7)
        .font('Helvetica-Bold')
        .fillColor(colors.muted)
        .text('HORARIOS', 450, 770, { characterSpacing: 1.8 });
      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor(colors.secondary)
        .text('Lun - Vie: 09:30 - 18:30', 450, 781);
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
    // Fondo GM completo
    doc.rect(0, 0, 595, 842).fill(colors.bg);

    // Header con logo de letras grande centrado
    if (fs.existsSync(letrasPath)) {
      doc.image(letrasPath, 190, 35, { width: 215 });
    }

    // Título del remolque
    doc
      .fontSize(26)
      .font('Helvetica-Bold')
      .fillColor(colors.text)
      .text(remolque.titulo?.toUpperCase() || 'REMOLQUE', 50, 180, {
        width: 495,
        characterSpacing: 2.5,
        lineGap: 8,
      });

    // Regla petrol
    const reglaY = doc.y + 14;
    doc
      .moveTo(50, reglaY)
      .lineTo(50 + 48, reglaY)
      .strokeColor(colors.petrol)
      .lineWidth(1.2)
      .stroke();

    // Subtítulo con información
    const subtitulo = [
      remolque.marca,
      remolque.modelo,
      remolque.condicion,
      remolque.categoria,
    ]
      .filter((x) => x)
      .join(' | ');

    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor(colors.petrol)
      .text(subtitulo, 50, reglaY + 14, { characterSpacing: 1.5 });

    // Imagen principal grande y centrada - Usar foto sin fondo si existe
    const mainImageUrl =
      remolque.fotoSinFondo1?.secure_url || remolque.imagenes?.[0]?.secure_url;

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
    drawFooter();

    // ==================== PÁGINA 2: CARACTERÍSTICAS TÉCNICAS ====================
    doc.addPage();

    // Fondo GM
    doc.rect(0, 0, 595, 842).fill(colors.bg);

    // Header - Solo logo de letras grande y título de sección
    if (fs.existsSync(letrasPath)) {
      doc.image(letrasPath, 190, 35, { width: 215 });
    }

    let y = 135;

    // Encabezado de sección: label acento tracked + hairline full-width
    doc
      .fontSize(8)
      .font('Helvetica-Bold')
      .fillColor(colors.petrol)
      .text('CARACTERÍSTICAS TÉCNICAS', 50, y, { characterSpacing: 1.8 });

    y += 14;
    doc
      .moveTo(50, y)
      .lineTo(545, y)
      .strokeColor(colors.hairline)
      .lineWidth(0.75)
      .stroke();

    y += 21;

    const tableStartY = y;
    const cellHeight = 22;
    const col1Width = 220;
    const col2Width = 275;

    // Función helper para añadir fila a la tabla (o mini-header de subsección)
    const addTableRow = (label: string, value: string, isHeader = false) => {
      if (isHeader) {
        doc
          .fontSize(8)
          .font('Helvetica-Bold')
          .fillColor(colors.petrol)
          .text(label.toUpperCase(), 50, y + 4, { characterSpacing: 1.8 });
        y += cellHeight;
        return;
      }

      doc
        .fontSize(7)
        .font('Helvetica')
        .fillColor(colors.muted)
        .text(label.toUpperCase(), 50, y + 7, {
          width: col1Width - 10,
          characterSpacing: 1.8,
        });

      doc
        .fontSize(10)
        .font('Helvetica')
        .fillColor(colors.text)
        .text(value, 50 + col1Width, y + 5, {
          width: col2Width - 10,
          align: 'right',
        });

      doc
        .moveTo(50, y + cellHeight)
        .lineTo(50 + col1Width + col2Width, y + cellHeight)
        .strokeColor(colors.hairline)
        .lineWidth(0.75)
        .stroke();

      y += cellHeight;
    };

    // Datos generales
    if (remolque.tipoCarroceria)
      addTableRow('Tipo de Carrocería', remolque.tipoCarroceria);
    if (remolque.cantidadEjes)
      addTableRow('Cantidad de Ejes', String(remolque.cantidadEjes));
    if (remolque.capacidadCarga)
      addTableRow('Capacidad de Carga', remolque.capacidadCarga);
    if (remolque.tara) addTableRow('Tara', `${remolque.tara} kg`);
    if (remolque.pbtc) addTableRow('PBTC', remolque.pbtc);

    // CHASIS
    if (remolque.chasis) {
      y += 10;
      addTableRow('CHASIS', '', true);

      if (remolque.chasis.tipo) addTableRow('Tipo', remolque.chasis.tipo);
      if (remolque.chasis.material)
        addTableRow('Material', remolque.chasis.material);
      if (remolque.chasis.pisoChapaEspesor)
        addTableRow('Piso Chapa Espesor', remolque.chasis.pisoChapaEspesor);
    }

    // DIMENSIONES
    if (remolque.dimensiones) {
      y += 10;
      addTableRow('DIMENSIONES', '', true);

      if (remolque.dimensiones.largoInterior)
        addTableRow(
          'Largo Interior',
          `${remolque.dimensiones.largoInterior} mm`,
        );
      if (remolque.dimensiones.anchoExterior)
        addTableRow(
          'Ancho Exterior',
          `${remolque.dimensiones.anchoExterior} mm`,
        );
      if (remolque.dimensiones.alturaBaranda)
        addTableRow(
          'Altura Baranda',
          `${remolque.dimensiones.alturaBaranda} mm`,
        );
    }

    // EJES Y SUSPENSIÓN
    if (remolque.ejesSuspension) {
      y += 10;
      addTableRow('EJES Y SUSPENSIÓN', '', true);

      if (remolque.ejesSuspension.tipoEjes)
        addTableRow('Ejes', remolque.ejesSuspension.tipoEjes);
      if (remolque.ejesSuspension.llantas)
        addTableRow('Llantas', remolque.ejesSuspension.llantas);
      if (remolque.ejesSuspension.suspension)
        addTableRow('Suspensión', remolque.ejesSuspension.suspension);
      if (remolque.ejesSuspension.frenos)
        addTableRow('Frenos', remolque.ejesSuspension.frenos);
    }

    // CARROCERÍA
    if (remolque.carroceria) {
      y += 10;
      addTableRow('CARROCERÍA', '', true);

      if (remolque.carroceria.tipo)
        addTableRow('Tipo', remolque.carroceria.tipo);
      if (remolque.carroceria.material)
        addTableRow('Material', remolque.carroceria.material);
      if (remolque.carroceria.pintura)
        addTableRow('Pintura', remolque.carroceria.pintura);
    }

    // Segunda imagen en la página 2 (si hay espacio) - Usar foto sin fondo si existe
    const secondImageUrl =
      remolque.fotoSinFondo2?.secure_url || remolque.imagenes?.[1]?.secure_url;

    if (secondImageUrl && y < 520) {
      y += 20;
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get(secondImageUrl, {
          responseType: 'arraybuffer',
        });
        const imageBuffer = Buffer.from(response.data);
        doc.image(imageBuffer, 50, y, { fit: [495, 180], align: 'center' });
      } catch (error) {
        console.error('Error loading second image:', error);
      }
    }

    // Footer página 2
    drawFooter();

    // ==================== PÁGINA 3: EQUIPAMIENTO (si hay) ====================
    if (
      remolque.equipamientoSerie?.length ||
      remolque.equipamientoOpcional?.length
    ) {
      doc.addPage();

      // Fondo GM
      doc.rect(0, 0, 595, 842).fill(colors.bg);

      // Header - Solo logo de letras grande
      if (fs.existsSync(letrasPath)) {
        doc.image(letrasPath, 190, 35, { width: 215 });
      }

      y = 135;

      // Crear dos columnas para equipamiento
      const col1X = 50;
      const col2X = 315;
      const colWidth = 230;

      // EQUIPAMIENTO DE SERIE
      if (remolque.equipamientoSerie?.length) {
        doc
          .fontSize(13)
          .font('Helvetica-Bold')
          .fillColor(colors.petrol)
          .text('EQUIPAMIENTO DE SERIE', col1X, y, { characterSpacing: 2.5 });

        let y1 = y + 30;

        remolque.equipamientoSerie.forEach((item) => {
          if (y1 > 380) return; // Dejar más espacio para imagen

          doc.rect(col1X, y1 + 3, 3, 3).fill(colors.petrol);
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor(colors.text)
            .text(item, col1X + 12, y1, { width: colWidth - 12 });

          y1 += 16;
        });
      }

      // EQUIPAMIENTO OPCIONAL
      if (remolque.equipamientoOpcional?.length) {
        doc
          .fontSize(13)
          .font('Helvetica-Bold')
          .fillColor(colors.petrol)
          .text('EQUIPAMIENTO OPCIONAL', col2X, y, { characterSpacing: 2.5 });

        let y2 = y + 30;

        remolque.equipamientoOpcional.forEach((item) => {
          if (y2 > 380) return; // Dejar más espacio para imagen

          doc.rect(col2X, y2 + 3, 3, 3).fill(colors.petrol);
          doc
            .fontSize(9)
            .font('Helvetica')
            .fillColor(colors.text)
            .text(item, col2X + 12, y2, { width: colWidth - 12 });

          y2 += 16;
        });
      }

      // Agregar segunda/tercera imagen en el espacio inferior - Usar foto sin fondo si existe
      const thirdPageImageUrl =
        remolque.fotoSinFondo2?.secure_url ||
        remolque.imagenes?.[remolque.imagenes.length > 2 ? 2 : 1]?.secure_url;

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
      drawFooter();
    }

    doc.end();
  }
}
