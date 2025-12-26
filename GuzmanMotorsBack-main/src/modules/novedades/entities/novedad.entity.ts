import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { MediaFile } from '../../../cloudinary';

export type NovedadDocument = Novedad & Document;

@Schema({
  timestamps: true,
  collection: 'novedades',
})
export class Novedad {
  @Prop({ required: true, trim: true })
  titulo!: string;

  @Prop({ required: true, type: String })
  contenido!: string;

  @Prop({ trim: true })
  resumen?: string;

  @Prop({ trim: true })
  categoria?: string;

  @Prop({ default: false })
  destacada?: boolean;

  @Prop({ type: Date, default: Date.now })
  fechaPublicacion?: Date;

  @Prop({ default: 0 })
  vistas?: number;

  @Prop({ default: false })
  deleted?: boolean;

  @Prop({
    type: [
      {
        url: String,
        public_id: String,
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
        titulo: { type: String, required: true },
        url: { type: String, required: true },
        descripcion: { type: String },
      },
    ],
    default: [],
  })
  links?: Array<{
    titulo: string;
    url: string;
    descripcion?: string;
  }>;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NovedadSchema = SchemaFactory.createForClass(Novedad);

// Índices para búsquedas rápidas
NovedadSchema.index({ deleted: 1 });
NovedadSchema.index({ destacada: 1 });
NovedadSchema.index({ categoria: 1 });
NovedadSchema.index({ fechaPublicacion: -1 });
NovedadSchema.index({ createdAt: -1 });

// Índice de texto para búsqueda full-text
NovedadSchema.index({
  titulo: 'text',
  contenido: 'text',
  resumen: 'text',
  categoria: 'text',
});
