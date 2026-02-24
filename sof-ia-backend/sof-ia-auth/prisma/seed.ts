import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@sofia.com';
  const adminName = process.env.SEED_ADMIN_NAME || 'Administrador SOF-IA';
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.usuario.upsert({
    where: { correo: adminEmail },
    update: {},
    create: {
      nombreCompleto: adminName,
      correo: adminEmail,
      passwordHash,
      rol: 'ADMIN_CONSULTORIO',
      estado: 'ACTIVO',
      primerIngreso: true,
    },
  });

  console.log('=== SEED COMPLETADO ===');
  console.log('Administrador listo para login:');
  console.log(`- correo: ${admin.correo}`);
  console.log('- password: Admin123!');
  console.log('No se crean datos demo adicionales.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
