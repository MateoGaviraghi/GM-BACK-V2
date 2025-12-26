import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import type { MediaFile } from '../../../cloudinary';

export type RemolqueDocument = HydratedDocument<Remolque>;

// Subdocumentos para organizar especificaciones técnicas
@Schema({ _id: false })
export class ChasisSpec {
  @Prop({ type: String })
  tipo?: string; // Ej: "Viga estructural doble T"

  @Prop({ type: String })
  material?: string; // Ej: "Acero SAE 1518"

  @Prop({ type: String })
  pisoChapaEspesor?: string; // Ej: "1/8"

  @Prop({ type: String })
  ejesTubularesDiametro?: string; // Ej: "5""

  @Prop({ type: String })
  paragolpe?: string; // Ej: "IRAM 10260-R58"

  @Prop({ type: String })
  engancheEmergencia?: string; // Ej: "5.000 kg"

  @Prop({ type: String })
  otros?: string; // Detalles adicionales
}

@Schema({ _id: false })
export class DimensionesSpec {
  @Prop({ type: Number })
  largoInterior?: number; // mm

  @Prop({ type: Number })
  anchoExterior?: number; // mm

  @Prop({ type: Number })
  alturaBaranda?: number; // mm

  @Prop({ type: Number })
  alturaFrente?: number; // mm

  @Prop({ type: Number })
  alturaContrafrente?: number; // mm

  @Prop({ type: Number })
  alturaPisoAlPiso?: number; // mm
}

@Schema({ _id: false })
export class EjesSuspensionSpec {
  @Prop({ type: String })
  tipoEjes?: string; // Ej: "Tubulares tipo disco"

  @Prop({ type: String })
  llantas?: string; // Ej: "9" x 22,5""

  @Prop({ type: String })
  suspension?: string; // Ej: "Mecánica de ballesta"

  @Prop({ type: String })
  frenos?: string; // Ej: "Q-PLUS 8" con ABS"
}

@Schema({ _id: false })
export class CarroceriaSpec {
  @Prop({ type: String })
  tipo?: string; // Ej: "Baranda volcable 6 por lado"

  @Prop({ type: String })
  material?: string; // Ej: "Chapa estriada 1,6 mm"

  @Prop({ type: String })
  pintura?: string; // Ej: "Esmalte poliuretano HS"

  @Prop({ type: String })
  tratamiento?: string; // Ej: "Fosfatizado"
}

@Schema({ timestamps: true })
export class Remolque {
  // ===== CAMPOS OBLIGATORIOS =====
  @Prop({ type: String, required: true })
  titulo!: string; // Ej: "ACOPLADO 4 EJES BARANDA VOLCABLE"

  @Prop({
    type: String,
    enum: ['0KM', 'USADO'],
    required: true,
  })
  condicion!: '0KM' | 'USADO';

  // ===== CAMPOS OPCIONALES =====
  @Prop({
    type: String,
    enum: ['ACOPLADO', 'SEMIREMOLQUE', 'BITREN', 'CARROCERIA'],
    required: false,
  })
  categoria?: 'ACOPLADO' | 'SEMIREMOLQUE' | 'BITREN' | 'CARROCERIA';

  @Prop({ type: String, required: false })
  marca?: string; // Ej: "LAMBERT"

  @Prop({ type: String, required: false })
  modelo?: string; // Ej: "A4BV"

  @Prop({ type: Date, required: false })
  anio?: Date;

  @Prop({ type: String, required: false })
  tipoCarroceria?: string; // Ej: "Baranda Volcable", "Batea", "Paquetera"

  @Prop({ type: Number, required: false })
  cantidadEjes?: number; // Ej: 4, 12, 33

  @Prop({ type: String, required: false })
  capacidadCarga?: string; // Ej: "18 pallets"

  @Prop({ type: Number, required: false })
  tara?: number; // Peso en kg

  @Prop({ type: String, required: false })
  pbtc?: string; // Ej: "45 Tn (4x2) / 52,5 Tn (6x2)"

  @Prop({ type: Number, required: false })
  kilometraje?: number; // Solo para USADOS

  @Prop({
    type: String,
    enum: ['Disponible', 'Reservado', 'Vendido'],
    default: 'Disponible',
    required: true,
  })
  estado!: 'Disponible' | 'Reservado' | 'Vendido';

  // ===== ESPECIFICACIONES TÉCNICAS DETALLADAS =====
  @Prop({ type: ChasisSpec, required: false })
  chasis?: ChasisSpec;

  @Prop({ type: DimensionesSpec, required: false })
  dimensiones?: DimensionesSpec;

  @Prop({ type: EjesSuspensionSpec, required: false })
  ejesSuspension?: EjesSuspensionSpec;

  @Prop({ type: CarroceriaSpec, required: false })
  carroceria?: CarroceriaSpec;

  // ===== EQUIPAMIENTO =====
  @Prop({ type: [String], default: [] })
  equipamientoSerie?: string[]; // Array de equipamiento de serie

  @Prop({ type: [String], default: [] })
  equipamientoOpcional?: string[]; // Array de opcionales

  // ===== OTROS =====
  @Prop({ type: String, required: false })
  garantia?: string; // Ej: "12 meses"

  @Prop({ type: String, required: false })
  descripcion?: string; // Descripción general/comercial

  // ===== MULTIMEDIA =====
  @Prop({
    type: [
      {
        public_id: { type: String, required: true },
        secure_url: { type: String, required: true },
        width: { type: Number },
        height: { type: Number },
        format: { type: String, required: true },
        bytes: { type: Number, required: true },
        thumbnails: {
          small: { type: String },
          medium: { type: String },
          large: { type: String },
        },
      },
    ],
    default: [],
  })
  imagenes?: MediaFile[];

  // ===== IMÁGENES SIN FONDO PARA PDF =====
  @Prop({
    type: {
      public_id: { type: String, required: true },
      secure_url: { type: String, required: true },
      width: { type: Number },
      height: { type: Number },
      format: { type: String, required: true },
      bytes: { type: Number, required: true },
    },
    required: false,
  })
  fotoSinFondo1?: MediaFile;

  @Prop({
    type: {
      public_id: { type: String, required: true },
      secure_url: { type: String, required: true },
      width: { type: Number },
      height: { type: Number },
      format: { type: String, required: true },
      bytes: { type: Number, required: true },
    },
    required: false,
  })
  fotoSinFondo2?: MediaFile;

  @Prop({
    type: [
      {
        public_id: { type: String, required: true },
        secure_url: { type: String, required: true },
        width: { type: Number },
        height: { type: Number },
        format: { type: String, required: true },
        bytes: { type: Number, required: true },
        duration: { type: Number },
        thumbnail: { type: String },
      },
    ],
    default: [],
  })
  videos?: MediaFile[];

  // Propiedades de timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const RemolqueSchema = SchemaFactory.createForClass(Remolque);

// Índices para búsqueda y filtrado
RemolqueSchema.index({
  titulo: 'text',
  marca: 'text',
  modelo: 'text',
  descripcion: 'text',
  tipoCarroceria: 'text',
});

RemolqueSchema.index({ condicion: 1 });
RemolqueSchema.index({ categoria: 1 });
RemolqueSchema.index({ marca: 1, modelo: 1 });
RemolqueSchema.index({ estado: 1 });
RemolqueSchema.index({ anio: -1 });
RemolqueSchema.index({ cantidadEjes: 1 });
RemolqueSchema.index({ kilometraje: 1 });
RemolqueSchema.index({ createdAt: -1 });
