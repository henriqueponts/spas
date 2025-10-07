import mysql from 'mysql2/promise';

let connection;

export const connectToDatabase = async () => {
  try {
    // Verifica se a conexão não existe ou se foi encerrada
    if (!connection || connection.connection._closing) {
      console.log('Creating new single database connection...');
      connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      });
      console.log('Database connection established successfully');
    }
    return connection;
  } catch (error) {
    console.error('Database connection error:', error);
    // Se a conexão falhar, reseta a variável para tentar de novo na próxima vez
    connection = null; 
    throw new Error(`Failed to connect to database: ${error.message}`);
  }
};