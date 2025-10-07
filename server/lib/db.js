import mysql from "mysql2/promise"

let pool

export const connectToDatabase = async () => {
  try {
    if (!pool) {
      console.log("Creating new database connection pool...")
      pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0,
      })
      console.log("Database connection pool established successfully")
    }
    return pool
  } catch (error) {
    console.error("Database connection error:", error)
    throw new Error(`Failed to connect to database: ${error.message}`)
  }
}
