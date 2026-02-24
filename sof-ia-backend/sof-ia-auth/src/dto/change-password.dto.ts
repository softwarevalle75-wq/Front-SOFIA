import { z } from 'zod';

export const changePasswordSchema = z.object({
  passwordActual: z.string().min(1, 'La contraseña actual es requerida'),
  nuevaPassword: z.string().min(1, 'La nueva contraseña es requerida'),
  confirmarPassword: z.string().min(1, 'Debe confirmar la nueva contraseña'),
}).refine((data) => data.nuevaPassword === data.confirmarPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmarPassword'],
});

export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
