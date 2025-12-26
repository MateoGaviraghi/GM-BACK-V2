import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { MediaFile } from '../../../cloudinary';

export type Vehiculos0kmDocument = HydratedDocument<Vehiculos0km>;

@Schema({ timestamps: true })
export class Vehiculos0km {
  @Prop({ type: String, required: false })
  titulo?: string;

  @Prop({ type: String, required: false })
  tipos?: string;

  @Prop({ type: String, required: false })
  variantes?: string;

  @Prop({ type: String, required: false })
  marca?: string;

  @Prop({ type: String, required: false })
  modelo?: string;

  @Prop({ type: Number, required: false })
  kilometraje?: number;

  @Prop({ type: String, required: false })
  tipoCombustible?: string;

  @Prop({ type: String, required: false })
  motor?: string;

  @Prop({ type: Date, required: false })
  anio?: Date;

  @Prop({ type: String, required: false })
  transmisiones?: string;

  @Prop({ type: String, required: false })
  tracciones?: string;

  @Prop({ type: String, required: false })
  potenciaMaxima?: string; // RPM-CV

  @Prop({ type: String, required: false })
  capacidadCarga?: string;

  @Prop({ type: String, required: false })
  sistemaFrenado?: string;

  @Prop({ type: String, required: false })
  ejes?: string;

  @Prop({
    type: String,
    enum: ['Disponible', 'Reservado', 'Vendido'],
    default: 'Disponible',
    required: true,
  })
  estado!: 'Disponible' | 'Reservado' | 'Vendido';

  @Prop({ type: String, required: false })
  descripcion?: string;

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

export const Vehiculos0kmSchema = SchemaFactory.createForClass(Vehiculos0km);

// Índices para búsqueda y filtrado
Vehiculos0kmSchema.index({
  titulo: 'text',
  tipos: 'text',
  variantes: 'text',
  marca: 'text',
  modelo: 'text',
  descripcion: 'text',
  tipoCombustible: 'text',
  motor: 'text',
  transmisiones: 'text',
  tracciones: 'text',
});

Vehiculos0kmSchema.index({ marca: 1, modelo: 1 });
Vehiculos0kmSchema.index({ estado: 1 });
Vehiculos0kmSchema.index({ anio: -1 });
Vehiculos0kmSchema.index({ kilometraje: 1 });
Vehiculos0kmSchema.index({ createdAt: -1 });
