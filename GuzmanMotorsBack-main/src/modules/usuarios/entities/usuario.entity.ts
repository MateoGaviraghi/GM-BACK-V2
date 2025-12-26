import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Usuario {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  passwordHash!: string;

  @Prop({ trim: true })
  nombre?: string;

  @Prop({ default: 'user', enum: ['user', 'admin'] })
  role!: 'user' | 'admin';
}

export type UsuarioDocument = Usuario & Document;
export const UsuarioSchema = SchemaFactory.createForClass(Usuario);
// Índice único ya definido en @Prop con unique: true, no es necesario duplicarlo aquí
