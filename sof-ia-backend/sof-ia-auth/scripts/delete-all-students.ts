import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Eliminando todos los estudiantes...');
  
  const resultado = await prisma.estudiante.deleteMany({});
  
  console.log(`Se eliminaron ${resultado.count} estudiantes`);
  
  await prisma.$disconnect();
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
