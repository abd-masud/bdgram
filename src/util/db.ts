import mysql from 'mysql2/promise';

let pool: mysql.Pool | null = null;
let lastConnectionAttempt: number | null = null;

async function createNewPool(): Promise<mysql.Pool> {
    return mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
        connectTimeout: 10000,
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306
    });
}

export async function connectionToDatabase(): Promise<mysql.Pool> {
    // Test existing pool if it exists
    if (pool) {
        try {
            const testConn = await pool.getConnection();
            await testConn.ping();
            testConn.release();
            return pool;
        } catch {
            pool = null; // Discard broken pool
        }
    }

    // Rate limit connection attempts
    const now = Date.now();
    if (lastConnectionAttempt && (now - lastConnectionAttempt) < 5000) {
        throw new Error('Too frequent connection attempts');
    }
    lastConnectionAttempt = now;

    // Create new pool
    try {
        pool = await createNewPool();
        return pool;
    } catch {
        throw new Error('Database connection failed');
    }
}

export async function runQuery(query: string, params: (string)[] = []) {
    let connection: mysql.PoolConnection | undefined;
    try {
        const pool = await connectionToDatabase();
        connection = await pool.getConnection();
        const [results] = await connection.query(query, params);
        return results;
    } catch (error) {
        throw error;
    } finally {
        if (connection) {
            try {
                connection.release();
            } catch (error) {
                console.error('Error releasing connection:', error);
            }
        }
    }
}

// Cleanup on process termination
process.on('SIGINT', async () => {
    if (pool) {
        try {
            await pool.end();
        } catch (error) {
            console.error('Error closing connection pool:', error);
        }
    }
    process.exit(0);
});