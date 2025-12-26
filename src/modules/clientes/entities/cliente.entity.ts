import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ClienteDocument = HydratedDocument<Cliente>;

@Schema({ timestamps: true })
export class Cliente {
  @Prop({ type: String, required: false })
  nombreCompleto?: string;

  @Prop({ type: Date, required: false })
  fechaNacimiento?: Date;

  @Prop({ type: String, required: false })
  provincia?: string;

  @Prop({ type: String, required: false })
  localidad?: string;

  @Prop({ type: String, required: false })
  direccion?: string;

  @Prop({ type: String, required: false })
  telefonoCelular?: string;

  @Prop({ type: String, required: false })
  telefonoFijo?: string;

  @Prop({ type: String, required: false })
  correoElectronico?: string;

  @Prop({ type: String, required: false })
  tipoVehiculo?: string;

  @Prop({ type: String, required: false })
  productoServicio?: string;

  @Prop({ type: String, required: false })
  marca?: string;

  @Prop({ type: String, required: false })
  modelo?: string;

  @Prop({ type: Number, required: false })
  anioCompra?: number;

  @Prop({
    type: String,
    enum: ['Comprador', 'Vendedor', 'Consultor'],
    required: false,
  })
  tipoCliente?: string;

  @Prop({ type: String, required: false })
  observaciones?: string;
  // Agregar explícitamente las propiedades de timestamps
  createdAt?: Date;
  updatedAt?: Date;
}

export const ClienteSchema = SchemaFactory.createForClass(Cliente);

// Índices para búsqueda/filtrado
ClienteSchema.index({
  nombreCompleto: 'text',
  correoElectronico: 'text',
  telefonoCelular: 'text',
  marca: 'text',
  modelo: 'text',
  productoServicio: 'text',
  tipoVehiculo: 'text',
  provincia: 'text',
  localidad: 'text',
  direccion: 'text',
});
ClienteSchema.index({ provincia: 1, localidad: 1 });
ClienteSchema.index({ marca: 1, modelo: 1 });
ClienteSchema.index({ anioCompra: -1 });
