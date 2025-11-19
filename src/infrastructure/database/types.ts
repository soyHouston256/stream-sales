/**
 * Database Infrastructure Type Definitions
 *
 * Provides type safety for database configuration and AWS Secrets Manager integration
 */

/**
 * Database connection configuration
 */
export interface DatabaseConfig {
  /**
   * PostgreSQL connection URL
   * Format: postgresql://username:password@host:port/database?schema=public
   */
  url: string;

  /**
   * Direct connection URL for migrations (bypasses connection pooling)
   * Used by Prisma CLI for migrations
   */
  directUrl?: string;
}

/**
 * AWS Secrets Manager secret structure for RDS credentials
 *
 * This is the expected format when creating secrets in AWS Secrets Manager
 * for database credentials.
 *
 * @example
 * ```json
 * {
 *   "host": "stream-sales-db.abc123.us-east-1.rds.amazonaws.com",
 *   "port": "5432",
 *   "username": "dbadmin",
 *   "password": "SecurePassword123!",
 *   "dbname": "streams",
 *   "engine": "postgres"
 * }
 * ```
 */
export interface DatabaseSecret {
  /**
   * Database host (RDS endpoint or IP address)
   * @example "stream-sales-db.abc123.us-east-1.rds.amazonaws.com"
   */
  host: string;

  /**
   * Database port (typically 5432 for PostgreSQL)
   * Can be string or number (AWS Secrets Manager may return either)
   */
  port: string | number;

  /**
   * Database username
   * @example "dbadmin"
   */
  username: string;

  /**
   * Database password
   * Will be URL-encoded when constructing connection string
   */
  password: string;

  /**
   * Database name
   * @example "streams"
   */
  dbname: string;

  /**
   * Database engine type
   * @example "postgres"
   */
  engine: string;

  /**
   * Optional SSL mode
   * @example "require" | "verify-full" | "disable"
   */
  sslmode?: string;
}

/**
 * Environment-specific database configuration
 */
export type DatabaseEnvironment = 'development' | 'production' | 'test';

/**
 * Database connection options for Prisma Client
 */
export interface PrismaConnectionOptions {
  /**
   * Maximum number of connections in the pool
   * Default: 5 (optimal for serverless)
   */
  connectionLimit?: number;

  /**
   * Connection pool timeout in seconds
   * Default: 20
   */
  poolTimeout?: number;

  /**
   * Enable query logging
   * Default: true in development, false in production
   */
  logQueries?: boolean;

  /**
   * Enable SSL/TLS for database connections
   * Default: false in development, true in production
   */
  enableSsl?: boolean;

  /**
   * SSL certificate validation mode
   * @example "require" | "verify-full" | "verify-ca"
   */
  sslMode?: 'require' | 'verify-full' | 'verify-ca' | 'disable';
}

/**
 * AWS Secrets Manager client configuration
 */
export interface SecretsManagerConfig {
  /**
   * AWS region where the secret is stored
   * @example "us-east-1"
   */
  region: string;

  /**
   * Secret name or ARN
   * @example "stream-sales/database/credentials"
   */
  secretName: string;

  /**
   * Optional endpoint for local testing (e.g., LocalStack)
   */
  endpoint?: string;
}

/**
 * Database initialization result
 */
export interface DatabaseInitializationResult {
  /**
   * Whether initialization was successful
   */
  success: boolean;

  /**
   * Number of connection attempts made
   */
  attempts: number;

  /**
   * Time taken to establish connection (milliseconds)
   */
  connectionTime: number;

  /**
   * Environment used (development/production)
   */
  environment: DatabaseEnvironment;

  /**
   * Error message if initialization failed
   */
  error?: string;
}

/**
 * Connection pool statistics
 */
export interface ConnectionPoolStats {
  /**
   * Number of active connections
   */
  active: number;

  /**
   * Number of idle connections
   */
  idle: number;

  /**
   * Maximum connections allowed
   */
  max: number;

  /**
   * Number of waiting requests
   */
  waiting: number;
}

/**
 * Database health check result
 */
export interface DatabaseHealthCheck {
  /**
   * Whether database is reachable
   */
  healthy: boolean;

  /**
   * Response time in milliseconds
   */
  responseTime: number;

  /**
   * Database version
   */
  version?: string;

  /**
   * Error message if unhealthy
   */
  error?: string;

  /**
   * Timestamp of health check
   */
  timestamp: Date;
}

/**
 * Type guard to validate DatabaseSecret structure
 */
export function isDatabaseSecret(obj: any): obj is DatabaseSecret {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.host === 'string' &&
    (typeof obj.port === 'string' || typeof obj.port === 'number') &&
    typeof obj.username === 'string' &&
    typeof obj.password === 'string' &&
    typeof obj.dbname === 'string' &&
    typeof obj.engine === 'string'
  );
}

/**
 * Environment variable names used for database configuration
 */
export const DATABASE_ENV_VARS = {
  /** Direct database URL (development) */
  DATABASE_URL: 'DATABASE_URL',

  /** AWS secret name (production) */
  AWS_SECRET_NAME: 'AWS_SECRET_NAME',

  /** AWS region */
  AWS_REGION: 'AWS_REGION',

  /** Node environment */
  NODE_ENV: 'NODE_ENV',
} as const;

/**
 * Default connection pool settings for different environments
 */
export const DEFAULT_CONNECTION_SETTINGS: Record<DatabaseEnvironment, PrismaConnectionOptions> = {
  development: {
    connectionLimit: 10,
    poolTimeout: 20,
    logQueries: true,
    enableSsl: false,
    sslMode: 'disable',
  },
  production: {
    connectionLimit: 5,
    poolTimeout: 20,
    logQueries: false,
    enableSsl: true,
    sslMode: 'require',
  },
  test: {
    connectionLimit: 3,
    poolTimeout: 10,
    logQueries: false,
    enableSsl: false,
    sslMode: 'disable',
  },
};
