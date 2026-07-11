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
      layout: 'landscape',
      margin: 0,
    });

    res.setHeader('Content-Type', 'application/pdf');
    // inline = abrir en navegador, attachment = descargar
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    doc.pipe(res);

    // ==================== DISEÑO "FICHA GM" (A4 APAISADO) ====================
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

    // ===== Fetch de imágenes Cloudinary (axios) =====
    const fetchImage = async (url?: string): Promise<Buffer | null> => {
      if (!url) return null;
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
        });
        return Buffer.from(response.data);
      } catch (error) {
        console.error('Error loading image:', error);
        return null;
      }
    };

    const img1 = await fetchImage(
      remolque.fotoSinFondo1?.secure_url || remolque.imagenes?.[0]?.secure_url,
    );
    const img2 = await fetchImage(
      remolque.fotoSinFondo2?.secure_url || remolque.imagenes?.[1]?.secure_url,
    );
    const img3 = await fetchImage(remolque.imagenes?.[2]?.secure_url);

    // ===== Helpers de dibujo =====
    const drawCover = (
      buf: Buffer,
      x: number,
      y: number,
      w: number,
      h: number,
    ) => {
      doc.save();
      doc.rect(x, y, w, h).clip();
      doc.image(buf, x, y, {
        cover: [w, h],
        align: 'center',
        valign: 'center',
      });
      doc.restore();
    };

    const drawBrandBand = () => {
      doc.rect(0, 0, 842, 72).fill(C.carbon);
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 20, { width: 30 });
      }
      if (fs.existsSync(letrasPath)) {
        doc.image(letrasPath, 80, 27, { width: 104 });
      }
      let bandTitle = remolque.titulo || 'Remolque';
      if (bandTitle.length > 52) bandTitle = bandTitle.slice(0, 51) + '…';
      doc
        .font('Helvetica-BoldOblique')
        .fontSize(17)
        .fillColor(C.white)
        .text(bandTitle, 302, 22, {
          width: 500,
          align: 'right',
          lineBreak: false,
        });
      doc
        .font('Helvetica-Bold')
        .fontSize(7)
        .fillColor(C.petrolBright)
        .text('FICHA TÉCNICA · GUZMÁN MOTORS', 302, 44, {
          width: 500,
          align: 'right',
          characterSpacing: 2.5,
        });
    };

    const drawSectionBand = (x: number, w: number, label: string) => {
      doc.rect(x, 96, w, 22).fill(C.carbon);
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(C.white)
        .text(label, x, 102, {
          width: w,
          align: 'center',
          characterSpacing: 2,
        });
    };

    const drawContactBand = () => {
      doc.rect(0, 535, 842, 60).fill(C.carbon);
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, 40, 549, { width: 26 });
      }
      const block = (x: number, label: string, value: string) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(6.5)
          .fillColor(C.petrolBright)
          .text(label, x, 551, { characterSpacing: 2 });
        doc.font('Helvetica').fontSize(8).fillColor(C.white).text(value, x, 562);
      };
      block(92, 'VISITANOS', 'Av. Blas Parera 6422 — Santa Fe');
      block(300, 'TELÉFONO', '+54 9 342 421 6850');
      block(470, 'EMAIL', 'hguzmanmotors@gmail.com');
      block(650, 'HORARIOS', 'Lun–Vie 8:30–12:30 · 15:30–18:30');
    };

    const drawPhotoPlate = (buf: Buffer, px: number, py: number) => {
      drawCover(buf, px, py, 258, 150);
      doc.rect(px, py, 258, 150).strokeColor(C.hair).lineWidth(1).stroke();
    };

    const drawCarbonPlate = (px: number, py: number) => {
      doc.rect(px, py, 258, 150).fill(C.carbon);
      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, px + 108, py + 42, { width: 42 });
      }
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(C.white)
        .text('GUZMÁN MOTORS', px, py + 100, {
          width: 258,
          align: 'center',
          characterSpacing: 2,
        });
    };

    const drawPanelPlate = (px: number, py: number) => {
      doc.rect(px, py, 258, 150).fill(C.panel);
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(C.mut)
        .text('Consultá más fotos en guzmanmotors.com.ar', px, py + 71, {
          width: 258,
          align: 'center',
        });
    };

    // ==================== PÁGINA 1: PORTADA ====================
    doc.rect(0, 0, 842, 595).fill(C.carbon);

    if (img1) {
      drawCover(img1, 0, 0, 842, 595);

      // Overlay inferior (legibilidad)
      const g = doc.linearGradient(0, 260, 0, 595);
      g.stop(0, C.carbon, 0).stop(0.45, C.carbon, 0.55).stop(1, C.carbon, 0.96);
      doc.rect(0, 260, 842, 335).fill(g);

      // Overlay superior sutil
      const g2 = doc.linearGradient(0, 0, 0, 120);
      g2.stop(0, C.carbon, 0.55).stop(1, C.carbon, 0);
      doc.rect(0, 0, 842, 120).fill(g2);
    } else {
      // Portada tipográfica: título como marca de agua gigante
      doc
        .font('Helvetica-BoldOblique')
        .fontSize(120)
        .fillColor(C.white)
        .fillOpacity(0.05)
        .text(remolque.titulo || 'Remolque', 40, 180, { width: 762 });
      doc.fillOpacity(1);
    }

    // Logos arriba-izquierda (blancos: solo sobre fondo oscuro)
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 40, 30, { width: 34 });
    }
    if (fs.existsSync(letrasPath)) {
      doc.image(letrasPath, 84, 38, { width: 118 });
    }

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
      .text('GUZMÁN MOTORS · CONCESIONARIA OFICIAL', 542, 48, {
        width: 260,
        align: 'right',
        characterSpacing: 2,
      });

    // Bloque inferior-izquierdo
    const eyebrow = [remolque.condicion, remolque.categoria, remolque.marca]
      .filter((x): x is string => Boolean(x))
      .map((x) => x.toUpperCase())
      .join('  ·  ');
    if (eyebrow) {
      doc
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor(C.petrolBright)
        .text(eyebrow, 40, 418, { characterSpacing: 2.5, lineBreak: false });
    }

    const tituloRaw = remolque.titulo || 'Remolque';
    const titleSize = tituloRaw.length <= 34 ? 42 : 30;
    doc.font('Helvetica-BoldOblique').fontSize(titleSize);
    const twoLineH =
      doc.heightOfString('Mg\nMg', { width: 640, lineGap: -4 }) + 2;
    let tituloFit = tituloRaw;
    while (
      doc.heightOfString(tituloFit, { width: 640, lineGap: -4 }) > twoLineH &&
      tituloFit.length > 2
    ) {
      tituloFit =
        (tituloFit.endsWith('…')
          ? tituloFit.slice(0, -2)
          : tituloFit.slice(0, -1)) + '…';
    }
    doc.fillColor(C.white).text(tituloFit, 40, 436, {
      width: 640,
      lineGap: -4,
    });
    const titleH = doc.heightOfString(tituloFit, { width: 640, lineGap: -4 });

    // Barra petrol
    const barY = 436 + titleH + 14;
    doc.rect(40, barY, 64, 4).fill(C.petrolBright);

    // Subtítulo: marca modelo — tipoCarroceria (los que existan)
    const marcaModelo = [remolque.marca, remolque.modelo]
      .filter(Boolean)
      .join(' ');
    const subtitulo = [marcaModelo, remolque.tipoCarroceria]
      .filter(Boolean)
      .join(' — ');
    if (subtitulo) {
      doc
        .font('Helvetica')
        .fontSize(10.5)
        .fillColor(C.white)
        .fillOpacity(0.85)
        .text(subtitulo, 40, barY + 4 + 14, { width: 640 });
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
    drawSectionBand(40, 480, 'CARACTERÍSTICAS TÉCNICAS');

    // Zona derecha: placas de foto
    const extraImg = img2 ?? img3;
    if (img2 && img3) {
      drawPhotoPlate(img2, 544, 96);
      drawPhotoPlate(img3, 544, 258);
    } else if (extraImg) {
      drawPhotoPlate(extraImg, 544, 96);
      drawCarbonPlate(544, 258);
    } else {
      drawCarbonPlate(544, 96);
      drawPanelPlate(544, 258);
    }

    drawContactBand();

    // ===== Tabla agrupada =====
    type Row = { label: string; value: string };
    const row = (label: string, value: unknown): Row | null =>
      value === undefined || value === null || value === ''
        ? null
        : { label, value: String(value) };
    const mm = (v?: number) =>
      v === undefined || v === null ? undefined : `${v} mm`;

    const groups = [
      {
        name: 'INFORMACIÓN GENERAL',
        rows: [
          row('Condición', remolque.condicion),
          row('Categoría', remolque.categoria),
          row('Marca', remolque.marca),
          row('Modelo', remolque.modelo),
          row('Tipo de carrocería', remolque.tipoCarroceria),
          row('Cantidad de ejes', remolque.cantidadEjes),
          row('Capacidad de carga', remolque.capacidadCarga),
          row(
            'Tara',
            remolque.tara !== undefined && remolque.tara !== null
              ? `${remolque.tara} kg`
              : undefined,
          ),
          row('PBTC', remolque.pbtc),
          row('Garantía', remolque.garantia),
          row('Estado', remolque.estado),
        ],
      },
      {
        name: 'CHASIS',
        rows: [
          row('Tipo', remolque.chasis?.tipo),
          row('Material', remolque.chasis?.material),
          row('Piso (espesor de chapa)', remolque.chasis?.pisoChapaEspesor),
          row(
            'Ejes tubulares (diámetro)',
            remolque.chasis?.ejesTubularesDiametro,
          ),
          row('Paragolpe', remolque.chasis?.paragolpe),
          row('Enganche de emergencia', remolque.chasis?.engancheEmergencia),
        ],
      },
      {
        name: 'DIMENSIONES',
        rows: [
          row('Largo interior', mm(remolque.dimensiones?.largoInterior)),
          row('Ancho exterior', mm(remolque.dimensiones?.anchoExterior)),
          row('Altura de baranda', mm(remolque.dimensiones?.alturaBaranda)),
          row('Altura de frente', mm(remolque.dimensiones?.alturaFrente)),
          row(
            'Altura de contrafrente',
            mm(remolque.dimensiones?.alturaContrafrente),
          ),
          row('Altura piso al piso', mm(remolque.dimensiones?.alturaPisoAlPiso)),
        ],
      },
      {
        name: 'EJES Y SUSPENSIÓN',
        rows: [
          row('Tipo de ejes', remolque.ejesSuspension?.tipoEjes),
          row('Llantas', remolque.ejesSuspension?.llantas),
          row('Suspensión', remolque.ejesSuspension?.suspension),
          row('Frenos', remolque.ejesSuspension?.frenos),
        ],
      },
      {
        name: 'CARROCERÍA',
        rows: [
          row('Tipo', remolque.carroceria?.tipo),
          row('Material', remolque.carroceria?.material),
          row('Pintura', remolque.carroceria?.pintura),
          row('Tratamiento', remolque.carroceria?.tratamiento),
        ],
      },
    ]
      .map((g) => ({
        name: g.name,
        rows: g.rows.filter((r): r is Row => r !== null),
      }))
      .filter((g) => g.rows.length > 0);

    const TABLE_MAX_Y = 500;

    // Altura de fila dinámica: valores largos envuelven a 2 líneas (sin "…")
    type SizedRow = Row & { h: number };
    const sizeRow = (r: Row): SizedRow => {
      doc.font('Helvetica-Bold').fontSize(8.5);
      const vh = doc.heightOfString(r.value, { width: 164 });
      return { ...r, h: vh > 11 ? 29 : 17 };
    };

    const drawGroupChunk = (name: string, chunk: SizedRow[], gy: number) => {
      const h = chunk.reduce((acc, r) => acc + r.h, 0);

      // Celda de categoría (sin hairlines internas: las filas no la cruzan)
      doc.rect(40, gy, 118, h).fill(C.panel);
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.ink);
      const nameH = doc.heightOfString(name, { width: 102 });
      doc.text(name, 48, gy + Math.max(3, (h - nameH) / 2), { width: 102 });

      // Filas
      let ry = gy;
      chunk.forEach((r, i) => {
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
        const isLast = i === chunk.length - 1;
        doc
          .moveTo(isLast ? 40 : 158, ry + r.h)
          .lineTo(520, ry + r.h)
          .strokeColor(C.hair)
          .lineWidth(0.7)
          .stroke();
        ry += r.h;
      });

      // Bordes verticales del grupo
      [40, 158, 340, 520].forEach((vx) => {
        doc
          .moveTo(vx, gy)
          .lineTo(vx, gy + h)
          .strokeColor(C.hair)
          .lineWidth(0.7)
          .stroke();
      });
    };

    let ty = 118;
    for (const group of groups) {
      const remaining = group.rows.map(sizeRow);
      while (remaining.length) {
        const chunk: SizedRow[] = [];
        let ch = 0;
        while (remaining.length && ty + ch + remaining[0].h <= TABLE_MAX_Y) {
          const r = remaining.shift() as SizedRow;
          chunk.push(r);
          ch += r.h;
        }
        if (!chunk.length) {
          doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
          drawBrandBand();
          drawSectionBand(40, 480, 'CARACTERÍSTICAS TÉCNICAS (CONT.)');
          drawContactBand();
          ty = 118;
          continue;
        }
        drawGroupChunk(group.name, chunk, ty);
        ty += ch;
      }
    }

    // ==================== PÁGINA 3+: EQUIPAMIENTO (si hay) ====================
    if (
      remolque.equipamientoSerie?.length ||
      remolque.equipamientoOpcional?.length
    ) {
      const serie = [...(remolque.equipamientoSerie ?? [])];
      const opcional = [...(remolque.equipamientoOpcional ?? [])];
      const MAX_ITEM_BOTTOM = 527;

      const measureItem = (text: string): number => {
        doc.font('Helvetica').fontSize(9);
        return doc.heightOfString(text, { width: 350 }) + 8;
      };

      const drawEquipItem = (x: number, y: number, text: string) => {
        doc.font('Helvetica-Bold').fontSize(10).fillColor(C.petrol).text('+', x, y);
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(C.ink)
          .text(text, x + 14, y + 1, { width: 350 });
      };

      const drawEquipSubtitle = (x: number, y: number, label: string) => {
        doc
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor(C.mut)
          .text(label, x, y, { characterSpacing: 2 });
      };

      const newEquipPage = () => {
        doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 });
        drawBrandBand();
        drawSectionBand(40, 762, 'EQUIPAMIENTO');
        drawContactBand();
      };

      if (serie.length && opcional.length) {
        // DE SERIE col izquierda · OPCIONAL col derecha
        while (serie.length || opcional.length) {
          newEquipPage();
          const before = serie.length + opcional.length;

          let yL = 132;
          if (serie.length) {
            drawEquipSubtitle(40, yL, 'DE SERIE');
            yL += 16;
          }
          while (serie.length) {
            const h = measureItem(serie[0]);
            if (yL + h > MAX_ITEM_BOTTOM) break;
            drawEquipItem(40, yL, serie.shift() as string);
            yL += h;
          }

          let yR = 132;
          if (opcional.length) {
            drawEquipSubtitle(432, yR, 'OPCIONAL');
            yR += 16;
          }
          while (opcional.length) {
            const h = measureItem(opcional[0]);
            if (yR + h > MAX_ITEM_BOTTOM) break;
            drawEquipItem(432, yR, opcional.shift() as string);
            yR += h;
          }

          if (serie.length + opcional.length === before) {
            // Ítem más alto que la página: forzar avance para no ciclar
            if (serie.length) drawEquipItem(40, yL, serie.shift() as string);
            else if (opcional.length)
              drawEquipItem(432, yR, opcional.shift() as string);
          }
        }
      } else {
        // Una sola lista: usa ambas columnas balanceadas
        const items = serie.length ? serie : opcional;
        const label = serie.length ? 'DE SERIE' : 'OPCIONAL';
        while (items.length) {
          newEquipPage();
          const before = items.length;
          const half = Math.ceil(items.length / 2);
          let placed = 0;

          let yL = 132;
          drawEquipSubtitle(40, yL, label);
          yL += 16;
          while (items.length && placed < half) {
            const h = measureItem(items[0]);
            if (yL + h > MAX_ITEM_BOTTOM) break;
            drawEquipItem(40, yL, items.shift() as string);
            yL += h;
            placed++;
          }

          let yR = 148;
          while (items.length) {
            const h = measureItem(items[0]);
            if (yR + h > MAX_ITEM_BOTTOM) break;
            drawEquipItem(432, yR, items.shift() as string);
            yR += h;
          }

          if (items.length === before) {
            drawEquipItem(40, yL, items.shift() as string);
          }
        }
      }
    }

    doc.end();
  }
}
