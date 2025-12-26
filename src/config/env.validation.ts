import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Base de datos
  MONGODB_URI: Joi.string().required(),

  // JWT
  JWT_SECRET: Joi.string().min(32).required().messages({
    'string.min': 'JWT_SECRET debe tener al menos 32 caracteres por seguridad',
    'any.required': 'JWT_SECRET es requerido para autenticación',
  }),

  // Cloudinary - Acepta URL completa O variables separadas
  CLOUDINARY_URL: Joi.string().optional(),
  CLOUDINARY_CLOUD_NAME: Joi.string().optional(),
  CLOUDINARY_API_KEY: Joi.string().optional(),
  CLOUDINARY_API_SECRET: Joi.string().optional(),

  // Servidor
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // Frontend URL para CORS
  FRONTEND_URL: Joi.string().uri().required().messages({
    'any.required':
      'FRONTEND_URL es requerido para configurar CORS correctamente',
  }),

  // CORS Origins (opcional, solo desarrollo)
  CORS_ORIGINS: Joi.string().optional(),
})
  .or('CLOUDINARY_URL', 'CLOUDINARY_CLOUD_NAME')
  .messages({
    'object.missing':
      'Debes proporcionar CLOUDINARY_URL o las variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET',
  });
