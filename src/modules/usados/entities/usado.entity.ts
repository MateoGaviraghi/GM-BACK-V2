import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import type { MediaFile } from '../../../cloudinary';

export type UsadoDocument = Usado & Document;

@Schema({
  timestamps: true,
  collection: 'usados',
})
export class Usado {
  @Prop({ trim: true })
  titulo?: string;

  @Prop({ trim: true })
  tipos?: string;

  @Prop({ trim: true })
  variantes?: string;

  @Prop({ required: true, trim: true })
  marca!: string;

  @Prop({ required: true, trim: true })
  modelo!: string;

  @Prop({ trim: true })
  version?: string;

  @Prop({ trim: true })
  tipoVehiculo?: string;

  @Prop({ min: 0 })
  kilometraje?: number;

  @Prop({ trim: true })
  tipoCombustible?: string;

  @Prop({ trim: true })
  motor?: string;

  @Prop({ type: Date })
  anio?: Date;

  @Prop({ trim: true })
  transmisiones?: string;

  @Prop({ trim: true })
  transmision?: string;

  @Prop({ trim: true })
  tracciones?: string;

  @Prop({ trim: true })
  traccion?: string;

  @Prop({ trim: true })
  potenciaMaxima?: string;

  @Prop({ trim: true })
  potencia?: string;

  @Prop({ trim: true })
  cilindrada?: string;

  @Prop({ trim: true })
  capacidadCarga?: string;

  @Prop({ trim: true })
  sistemaFrenado?: string;

  @Prop({ trim: true })
  ejes?: string;

  @Prop({ trim: true })
  color?: string;

  @Prop()
  cantidadPuertas?: number;

  @Prop()
  cantidadAsientos?: number;

  @Prop({ type: [String], default: [] })
  equipamiento?: string[];

  @Prop({
    type: String,
    enum: ['Disponible', 'Reservado', 'Vendido'],
    default: 'Disponible',
  })
  estado?: 'Disponible' | 'Reservado' | 'Vendido';

  @Prop({ type: String, trim: true })
  descripcion?: string;

  @Prop({
    type: [
      {
        public_id: String,
        secure_url: String,
        width: Number,
        height: Number,
        format: String,
        bytes: Number,
        thumbnails: {
          small: String,
          medium: String,
          large: String,
        },
      },
    ],
    default: [],
  })
  imagenes?: MediaFile[];

  @Prop({
    type: [
      {
        public_id: String,
        secure_url: String,
        width: Number,
        height: Number,
        format: String,
        bytes: Number,
        thumbnail: String,
        duration: Number,
        thumbnails: {
          small: String,
          medium: String,
          large: String,
        },
      },
    ],
    default: [],
  })
  videos?: MediaFile[];

  @Prop({
    type: {
      public_id: String,
      secure_url: String,
      width: Number,
      height: Number,
      format: String,
      bytes: Number,
      thumbnails: {
        small: String,
        medium: String,
        large: String,
      },
    },
  })
  fotoSinFondo1?: MediaFile;

  @Prop({
    type: {
      public_id: String,
      secure_url: String,
      width: Number,
      height: Number,
      format: String,
      bytes: Number,
      thumbnails: {
        small: String,
        medium: String,
        large: String,
      },
    },
  })
  fotoSinFondo2?: MediaFile;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UsadoSchema = SchemaFactory.createForClass(Usado);

// Índices para búsquedas rápidas
UsadoSchema.index({ marca: 1 });
UsadoSchema.index({ modelo: 1 });
UsadoSchema.index({ estado: 1 });
UsadoSchema.index({ tipos: 1 });
UsadoSchema.index({ createdAt: -1 });

// Índice de texto para búsqueda full-text
UsadoSchema.index({
  titulo: 'text',
  marca: 'text',
  modelo: 'text',
  tipos: 'text',
  variantes: 'text',
  descripcion: 'text',
});
