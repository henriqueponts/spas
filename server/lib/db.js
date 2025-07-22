import mysql from 'mysql2/promise';
import 'dotenv/config'; // Garante que o .env seja lido

let pool; // Vamos chamar de 'pool' para ficar mais claro

export const connectToDatabase = async () => {
  try {
    // Se o pool ainda não foi criado, crie-o
    if (!pool) {
      console.log('Creating new database connection pool...');
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10, // Limite de conexões simultâneas
        queueLimit: 0
      });
      console.log('✅ Database connection pool established successfully');
    }
    // Retorna o pool de conexões
    return pool;
  } catch (error) {
    console.error('🔥🔥🔥 DATABASE CONNECTION POOL FAILED:', error);
    // Encerra a aplicação se a conexão com o banco falhar
    process.exit(1); 
  }
};