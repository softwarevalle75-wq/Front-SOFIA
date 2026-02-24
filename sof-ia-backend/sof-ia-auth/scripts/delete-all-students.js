require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sofia_auth'
});

async function main() {
  console.log('Conectando a la base de datos...');
  await client.connect();
  
  console.log('Eliminando todos los estudiantes...');
  const resultado = await client.query('DELETE FROM estudiantes');
  
  console.log(`Se eliminaron ${resultado.rowCount} estudiantes`);
  
  await client.end();
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  });
