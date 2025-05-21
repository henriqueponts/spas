import mysql from 'mysql2/promise';

let connection;

export const connectToDatabase = async () => {
  try {
    if (!connection) {
      console.log('Creating new database connection...');
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
    throw new Error(`Failed to connect to database: ${error.message}`);
  }
};