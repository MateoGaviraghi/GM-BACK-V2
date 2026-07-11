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
      layout: 'landscape',
      margin: 0,
    });

    res.setHeader('Content-Type', 'application/pdf');
    // inline = abrir en navegador, attachment = descargar
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    doc.pipe(res);

    const C = {
      carbon: '#14171C',
      panel: '#F4F5F7',
      hair: '#E3E5E8',
      ink: '#16181D',
      mut: '#6E7681',
      petrol: '#127C8C',
      petrolBright: '#6FC0D4',
      white: '#FFFFFF',
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
    const hasLogo = fs.existsSync(logoPath);
    const hasLetras = fs.existsSync(letrasPath);

    // ---- Fetch de imágenes Cloudinary (axios) ----
    const axios = (await import('axios')).default;
    const fetchImage = async (url?: string): Promise<Buffer | null> => {
      if (!url) return null;
      try {
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        return Buffer.from(response.data);
      } catch (error) {
        console.error('Error loading image:', error);
        return null;
      }
    };

    const mainImageUrl =
      usado.fotoSinFondo1?.secure_url || usado.imagenes?.[0]?.secure_url;
    const extra1Url = usado.imagenes?.[1]?.secure_url;
    const extra2Url =
      usado.fotoSinFondo2?.secure_url || usado.imagenes?.[2]?.secure_url;

    const [mainBuf, extraBufA, extraBufB] = await Promise.all([
      fetchImage(mainImageUrl),
      fetchImage(extra1Url),
      fetchImage(extra2Url),
    ]);

    // ---- Datos ----
    const W = 842;
    const H = 595;
    const titulo = usado.titulo || 'Vehículo usado';
    const kmFmt =
      usado.kilometraje != null
        ? usado.kilometraje.toLocaleString('es-AR')
        : undefined;

    interface FichaRow {
      label: string;
      value: string;
    }
    interface FichaGroup {
      name: string;
      rows: FichaRow[];
    }
    const buildGroup = (
      name: string,
      defs: [string, string | number | undefined | null][],
    ): FichaGroup => ({
      name,
      rows: defs
        .filter(
          (d) =>
            d[1] !== undefined && d[1] !== null && String(d[1]).trim() !== '',
        )
        .map((d) => ({ label: d[0], value: String(d[1]) })),
    });

    const groups: FichaGroup[] = [
      buildGroup('INFORMACIÓN GENERAL', [
        ['Condición / Tipo', usado.tipoVehiculo],
        ['Marca', usado.marca],
        ['Modelo', usado.modelo],
        ['Versión', usado.version],
        ['Año', usado.anio],
        ['Color', usado.color],
        ['Kilometraje', kmFmt ? `${kmFmt} km` : undefined],
        ['Estado', usado.estado],
      ]),
      buildGroup('MOTOR Y TRANSMISIÓN', [
        ['Cilindrada', usado.cilindrada],
        ['Potencia', usado.potencia || usado.potenciaMaxima],
        ['Combustible', usado.tipoCombustible],
        ['Transmisión', usado.transmision || usado.transmisiones],
        ['Tracción', usado.traccion || usado.tracciones],
      ]),
      buildGroup('CONFIGURACIÓN', [
        ['Puertas', usado.cantidadPuertas],
        ['Asientos', usado.cantidadAsientos],
      ]),
    ].filter((g) => g.rows.length > 0);

    // ---- Helpers de dibujo ----
    const drawBrandBand = () => {
      doc.rect(0, 0, W, 72).fill(C.carbon);
      if (hasLogo) doc.image(logoPath, 40, 20, { width: 30 });
      if (hasLetras) doc.image(letrasPath, 80, 27, { width: 104 });
      doc.font('Helvetica-BoldOblique').fontSize(17);
      let bandTitle = titulo;
      while (bandTitle.length > 1 && doc.widthOfString(bandTitle) > 560) {
        bandTitle = bandTitle.slice(0, -1).trimEnd();
      }
      if (bandTitle !== titulo) bandTitle += '…';
      doc
        .fillColor(C.white)
        .text(bandTitle, 242, 22, { width: 560, align: 'right' });
      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor(C.petrolBright)
        .text('FICHA TÉCNICA · GUZMÁN MOTORS', 442, 44, {
          width: 360,
          align: 'right',
          characterSpacing: 2.5,
        });
    };

    const drawContactBand = () => {
      doc.rect(0, 535, W, 60).fill(C.carbon);
      if (hasLogo) doc.image(logoPath, 40, 549, { width: 26 });
      const blocks = [
        { x: 92, label: 'VISITANOS', value: 'Av. Blas Parera 6422 — Santa Fe' },
        { x: 300, label: 'TELÉFONO', value: '+54 9 342 421 6850' },
        { x: 470, label: 'EMAIL', value: 'hguzmanmotors@gmail.com' },
        {
          x: 650,
          label: 'HORARIOS',
          value: 'Lun–Vie 8:30–12:30 · 15:30–18:30',
        },
      ];
      for (const b of blocks) {
        doc
          .font('Helvetica-Bold')
          .fontSize(6.5)
          .fillColor(C.petrolBright)
          .text(b.label, b.x, 555, { characterSpacing: 2, lineBreak: false });
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor(C.white)
          .text(b.value, b.x, 566, { lineBreak: false });
      }
    };

    const drawSectionHeader = (
      label: string,
      x: number,
      wBand: number,
      y: number,
    ) => {
      doc.rect(x, y, wBand, 22).fill(C.carbon);
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(C.white)
        .text(label, x, y + 7, {
          width: wBand,
          align: 'center',
          characterSpacing: 2,
        });
    };

    // ==================== PÁGINA 1: PORTADA ====================
    doc.rect(0, 0, W, H).fill(C.carbon);

    if (mainBuf) {
      doc.save();
      doc.rect(0, 0, W, H).clip();
      doc.image(mainBuf, 0, 0, {
        cover: [W, H],
        align: 'center',
        valign: 'center',
      });
      doc.restore();
    } else {
      // Portada tipográfica: título como marca de agua gigante
      doc
        .font('Helvetica-BoldOblique')
        .fontSize(120)
        .fillColor(C.white)
        .fillOpacity(0.05)
        .text(titulo, 40, 180, { width: 762, height: 380 });
      doc.fillOpacity(1);
    }

    // Overlay inferior (legibilidad)
    const g = doc.linearGradient(0, 260, 0, 595);
    g.stop(0, C.carbon, 0).stop(0.45, C.carbon, 0.55).stop(1, C.carbon, 0.96);
    doc.rect(0, 260, 842, 335).fill(g);
    // Overlay superior sutil
    const g2 = doc.linearGradient(0, 0, 0, 120);
    g2.stop(0, C.carbon, 0.55).stop(1, C.carbon, 0);
    doc.rect(0, 0, 842, 120).fill(g2);

    // Logos arriba-izquierda (blancos: solo sobre fondo oscuro)
    if (hasLogo) doc.image(logoPath, 40, 30, { width: 34 });
    if (hasLetras) doc.image(letrasPath, 84, 38, { width: 118 });

    // Arriba-derecha
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(C.white)
      .fillOpacity(0.95)
      .text('FICHA TÉCNICA', 542, 34, {
        width: 260,
        align: 'right',
        characterSpacing: 3,
      });
    doc.fillOpacity(1);
    doc
      .font('Helvetica-Bold')
      .fontSize(7)
      .fillColor(C.petrolBright)
      .text('GUZMÁN MOTORS · CONCESIONARIA OFICIAL', 442, 48, {
        width: 360,
        align: 'right',
        characterSpacing: 2,
      });

    // Bloque inferior-izquierdo
    const eyebrowParts: string[] = [];
    if (usado.tipoVehiculo) eyebrowParts.push(usado.tipoVehiculo);
    if (usado.anio) eyebrowParts.push(String(usado.anio));
    if (kmFmt) eyebrowParts.push(`${kmFmt} KM`);
    if (eyebrowParts.length) {
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(C.petrolBright)
        .text(eyebrowParts.join('  ·  ').toUpperCase(), 40, 418, {
          width: 640,
          height: 14,
          ellipsis: true,
          characterSpacing: 2.5,
        });
    }

    const titleSize = titulo.length <= 34 ? 42 : 30;
    doc.font('Helvetica-BoldOblique').fontSize(titleSize).fillColor(C.white);
    const twoLineH = doc.heightOfString('Xy\nXy', { width: 640, lineGap: -4 });
    let coverTitle = titulo;
    while (
      coverTitle.length > 2 &&
      doc.heightOfString(coverTitle + '…', { width: 640, lineGap: -4 }) >
        twoLineH + 1
    ) {
      coverTitle = coverTitle.slice(0, -1).trimEnd();
    }
    if (coverTitle !== titulo) coverTitle += '…';
    doc.text(coverTitle, 40, 436, { width: 640, lineGap: -4 });
    const titleH = doc.heightOfString(coverTitle, { width: 640, lineGap: -4 });

    // Barra petrol
    const barY = 436 + titleH + 14;
    doc.rect(40, barY, 64, 4).fill(C.petrolBright);

    // Subtítulo
    const subLeft = [usado.marca, usado.modelo, usado.version]
      .filter(Boolean)
      .join(' ');
    const subtitulo = [subLeft, usado.color].filter(Boolean).join(' — ');
    if (subtitulo) {
      doc
        .font('Helvetica')
        .fontSize(10.5)
        .fillColor(C.white)
        .fillOpacity(0.85)
        .text(subtitulo, 40, barY + 4 + 14, {
          width: 640,
          height: 14,
          ellipsis: true,
        });
      doc.fillOpacity(1);
    }

    // Abajo-derecha
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(C.white)
      .fillOpacity(0.75)
      .text('www.guzmanmotors.com.ar', 542, 560, {
        width: 260,
        align: 'right',
        characterSpacing: 2,
      });
    doc.fillOpacity(1);

    // ==================== PÁGINA 2: CARACTERÍSTICAS TÉCNICAS ====================
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
    drawBrandBand();
    drawContactBand();

    // Zona derecha: placas de foto
    const drawPhotoPlate = (buf: Buffer, x: number, y: number) => {
      doc.save();
      doc.rect(x, y, 258, 150).clip();
      doc.image(buf, x, y, {
        cover: [258, 150],
        align: 'center',
        valign: 'center',
      });
      doc.restore();
      doc.rect(x, y, 258, 150).lineWidth(1).strokeColor(C.hair).stroke();
    };
    const drawCarbonPlate = (x: number, y: number) => {
      doc.rect(x, y, 258, 150).fill(C.carbon);
      if (hasLogo) doc.image(logoPath, x + 108, y + 42, { width: 42 });
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(C.white)
        .text('GUZMÁN MOTORS', x, y + 98, {
          width: 258,
          align: 'center',
          characterSpacing: 2,
        });
    };
    const drawPanelPlate = (x: number, y: number) => {
      doc.rect(x, y, 258, 150).fill(C.panel);
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(C.mut)
        .text('Consultá más fotos en guzmanmotors.com.ar', x + 20, y + 70, {
          width: 218,
          align: 'center',
        });
    };

    const extraBufs = [extraBufA, extraBufB].filter(
      (b): b is Buffer => b !== null,
    );
    if (extraBufs.length >= 2) {
      drawPhotoPlate(extraBufs[0], 544, 96);
      drawPhotoPlate(extraBufs[1], 544, 258);
    } else if (extraBufs.length === 1) {
      drawPhotoPlate(extraBufs[0], 544, 96);
      drawCarbonPlate(544, 258);
    } else {
      drawCarbonPlate(544, 96);
      drawPanelPlate(544, 258);
    }

    // Tabla agrupada
    drawSectionHeader('CARACTERÍSTICAS TÉCNICAS', 40, 480, 96);

    let tableY = 118;

    // Altura de fila dinámica: valores largos envuelven a 2 líneas (sin "…")
    type SizedFichaRow = FichaRow & { h: number };
    const sizeRow = (r: FichaRow): SizedFichaRow => {
      doc.font('Helvetica-Bold').fontSize(8.5);
      const vh = doc.heightOfString(r.value, { width: 164 });
      return { ...r, h: vh > 11 ? 29 : 17 };
    };

    const drawGroup = (name: string, rows: SizedFichaRow[], startY: number) => {
      const groupH = rows.reduce((acc, r) => acc + r.h, 0);
      // Celda de categoría (sin hairlines internas: las filas no la cruzan)
      doc.rect(40, startY, 118, groupH).fillAndStroke(C.panel, C.hair);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.ink);
      const catH = doc.heightOfString(name, { width: 102 });
      doc.text(name, 48, startY + Math.max(4, (groupH - catH) / 2), {
        width: 102,
      });
      // Filas label/valor
      let ry = startY;
      rows.forEach((r, i) => {
        doc
          .font('Helvetica')
          .fontSize(8.5)
          .fillColor(C.mut)
          .text(r.label, 166, ry + 4.5, {
            width: 166,
            height: 12,
            ellipsis: true,
          });
        doc
          .font('Helvetica-Bold')
          .fontSize(8.5)
          .fillColor(C.ink)
          .text(r.value, 348, ry + 4.5, {
            width: 164,
            height: r.h - 8,
            ellipsis: true,
          });
        // La línea de fila arranca en x=158 para NO tachar la celda de categoría;
        // la última fila del grupo cierra el borde inferior completo.
        const isLast = i === rows.length - 1;
        doc
          .moveTo(isLast ? 40 : 158, ry + r.h)
          .lineTo(520, ry + r.h)
          .lineWidth(0.7)
          .strokeColor(C.hair)
          .stroke();
        ry += r.h;
      });
      // Bordes verticales del grupo
      for (const vx of [40, 158, 340, 520]) {
        doc
          .moveTo(vx, startY)
          .lineTo(vx, startY + groupH)
          .lineWidth(0.7)
          .strokeColor(C.hair)
          .stroke();
      }
    };

    for (const group of groups) {
      const sized = group.rows.map(sizeRow);
      const groupH = sized.reduce((acc, r) => acc + r.h, 0);
      if (tableY + groupH > 500 && tableY > 118) {
        // Continúa en página clonada
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
        drawBrandBand();
        drawContactBand();
        drawSectionHeader('CARACTERÍSTICAS TÉCNICAS (CONT.)', 40, 480, 96);
        tableY = 118;
      }
      drawGroup(group.name, sized, tableY);
      tableY += groupH;
    }

    // ==================== PÁGINA 3+: EQUIPAMIENTO (si hay) ====================
    if (usado.equipamiento && usado.equipamiento.length > 0) {
      const newEquipPage = () => {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
        drawBrandBand();
        drawContactBand();
        drawSectionHeader('EQUIPAMIENTO', 40, 762, 96);
      };

      const drawEquipItem = (x: number, y: number, text: string) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor(C.petrol)
          .text('+', x, y, { lineBreak: false });
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(C.ink)
          .text(text, x + 14, y + 1, { width: 350 });
      };

      let remaining = [...usado.equipamiento];
      const startY = 132;
      const maxY = 500;

      while (remaining.length > 0) {
        newEquipPage();
        doc.font('Helvetica').fontSize(9);
        const heights = remaining.map(
          (t) => doc.heightOfString(t, { width: 350 }) + 8,
        );
        const sumH = (from: number, to: number) =>
          heights.slice(from, to).reduce((s, h) => s + h, 0);

        // Primera mitad col izquierda, resto derecha
        let split = Math.ceil(remaining.length / 2);
        while (split > 1 && startY + sumH(0, split) > maxY) split--;

        let consumed = 0;
        let yy = startY;
        for (let i = 0; i < split; i++) {
          if (yy + heights[i] > maxY && i > 0) break;
          drawEquipItem(40, yy, remaining[i]);
          yy += heights[i];
          consumed = i + 1;
        }
        if (consumed === split) {
          yy = startY;
          for (let i = split; i < remaining.length; i++) {
            if (yy + heights[i] > maxY && yy > startY) break;
            drawEquipItem(432, yy, remaining[i]);
            yy += heights[i];
            consumed = i + 1;
          }
        }
        if (consumed === 0) {
          drawEquipItem(40, startY, remaining[0]);
          consumed = 1;
        }
        remaining = remaining.slice(consumed);
      }
    }

    doc.end();
  }
}
