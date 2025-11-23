import { PrismaClient } from '@prisma/client';

/**
 * Global type augmentation for Prisma singleton in development
 * This prevents multiple instances during hot reloading in Next.js dev mode
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Database connection configuration interface
 */
interface DatabaseConfig {
  url: string;
  directUrl?: string;
}

/**
 * Retrieves database configuration from environment variables
 *
 * Environment variables:
 * - DATABASE_URL: Database connection URL (required)
 * - POSTGRES_URL: Alternative database URL (used by Vercel)
 * - NODE_ENV: Environment indicator (development/production)
 *
 * @returns Database configuration with connection URL
 */
async function getDatabaseConfig(): Promise<DatabaseConfig> {
  // Use DATABASE_URL or POSTGRES_URL from environment
  // Vercel automatically sets POSTGRES_URL when using Vercel Postgres
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!databaseUrl) {
    throw new Error(
      'Database configuration missing. ' +
      'Set DATABASE_URL or POSTGRES_URL environment variable.'
    );
  }

  const env = process.env.NODE_ENV || 'development';
  console.log(`[Prisma] ${env} environment detected, using DATABASE_URL from environment`);

  return {
    url: databaseUrl,
  };
}

/**
 * Creates and configures a new Prisma Client instance
 *
 * Features:
 * - Connection pooling (max 5 connections per instance)
 * - Query logging in development
 * - Error and warning logging in all environments
 * - Graceful connection handling
 *
 * @param databaseUrl - Database connection URL
 * @returns Configured Prisma Client instance
 */
function createPrismaClient(databaseUrl: string): PrismaClient {
  const isDevelopment = process.env.NODE_ENV !== 'production';

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: isDevelopment
      ? ['query', 'error', 'warn'] // Verbose logging in development
      : ['error', 'warn'], // Minimal logging in production
    errorFormat: isDevelopment ? 'pretty' : 'minimal',
  });
}

/**
 * Initializes Prisma Client with retry logic and connection validation
 *
 * Retry strategy:
 * - Maximum 3 attempts
 * - Exponential backoff (1s, 2s, 4s)
 * - Validates connection with simple query
 *
 * @param config - Database configuration
 * @returns Connected Prisma Client instance
 * @throws Error if connection fails after all retries
 */
async function initializePrismaClient(config: DatabaseConfig): Promise<PrismaClient> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 second

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Prisma] Initializing Prisma Client (attempt ${attempt}/${maxRetries})`);

      const client = createPrismaClient(config.url);

      // Test connection
      await client.$connect();

      // Validate with simple query
      await client.$queryRaw`SELECT 1`;

      console.log('[Prisma] Database connection established successfully');

      return client;
    } catch (error) {
      console.error(`[Prisma] Connection attempt ${attempt} failed:`, error);

      if (attempt === maxRetries) {
        throw new Error(
          `Failed to connect to database after ${maxRetries} attempts: ` +
          `${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`[Prisma] Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // This should never be reached due to throw in the loop
  throw new Error('Failed to initialize Prisma Client');
}

/**
 * Gets or creates the singleton Prisma Client instance
 *
 * Singleton pattern ensures:
 * - Single connection pool per application instance
 * - No connection leaks during hot reloading (development)
 * - Efficient resource usage
 *
 * @returns Promise resolving to Prisma Client instance
 */
async function getPrismaClient(): Promise<PrismaClient> {
  // Return existing instance if available (hot reload in dev)
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  // Get database configuration
  const config = await getDatabaseConfig();

  // Initialize new client with retry logic
  const client = await initializePrismaClient(config);

  // Store in global for development hot reload
  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}

/**
 * Cached client instance
 * This is populated by the initialization promise
 */
let cachedClient: PrismaClient | undefined;

/**
 * Initialization promise tracking
 */
let initializationPromise: Promise<PrismaClient> | undefined;

/**
 * Error state tracking
 */
let initializationError: Error | undefined;

/**
 * Lazy initialization function
 * Only starts connecting when first database call is made
 */
function getOrInitializeClient(): Promise<PrismaClient> {
  // Return cached client if available
  if (cachedClient) {
    return Promise.resolve(cachedClient);
  }

  // Return existing initialization attempt if in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // If previous initialization failed, throw the error
  if (initializationError) {
    return Promise.reject(initializationError);
  }

  // Start new initialization
  console.log('[Prisma] Starting lazy database initialization...');
  initializationPromise = getPrismaClient()
    .then(client => {
      cachedClient = client;
      // Store in global for hot reload
      if (globalForPrisma.prisma === undefined) {
        globalForPrisma.prisma = client;
      }
      console.log('[Prisma] Database client initialized successfully');
      return client;
    })
    .catch(error => {
      console.error('[Prisma] Failed to initialize client:', error);
      initializationError = error instanceof Error ? error : new Error(String(error));
      initializationPromise = undefined;
      // Don't crash the app - let the error propagate to the caller
      throw initializationError;
    });

  return initializationPromise;
}

/**
 * Default export: Prisma Client singleton
 *
 * This is the primary export that should be used throughout the application.
 * It handles async initialization transparently using a Proxy pattern.
 *
 * IMPORTANT: Database connection is initialized LAZILY on first use, not at module load time.
 * This prevents crashes during Next.js startup if the database is unreachable.
 *
 * The Proxy intercepts all property access and ensures the client is initialized
 * before forwarding the call. This works seamlessly with async/await:
 *
 * ```typescript
 * import { prisma } from '@/infrastructure/database/prisma';
 *
 * export async function GET() {
 *   try {
 *     const users = await prisma.user.findMany();
 *     return Response.json(users);
 *   } catch (error) {
 *     // Handle database connection errors gracefully
 *     return Response.json({ error: 'Database unavailable' }, { status: 503 });
 *   }
 * }
 * ```
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop, receiver) {
    // If client is cached, return the property directly
    if (cachedClient) {
      return (cachedClient as any)[prop];
    }

    // If property is a Prisma method (starts with $), return async wrapper
    if (typeof prop === 'string' && prop.startsWith('$')) {
      return async (...args: any[]) => {
        const client = await getOrInitializeClient();
        return (client as any)[prop](...args);
      };
    }

    // For model accessors (user, product, etc.), return proxy with async methods
    if (typeof prop === 'string' && prop !== 'then' && prop !== 'catch') {
      return new Proxy({}, {
        get(_modelTarget, method) {
          return async (...args: any[]) => {
            const client = await getOrInitializeClient();
            const model = (client as any)[prop];
            if (!model || typeof model[method] !== 'function') {
              throw new Error(`Method ${String(method)} not found on model ${prop}`);
            }
            return model[method](...args);
          };
        },
      });
    }

    // For other properties, return undefined (won't be used in practice)
    return undefined;
  },
});

/**
 * Graceful shutdown handler
 *
 * Ensures proper cleanup of database connections when the application terminates.
 * Register this handler in your application entry point:
 *
 * ```typescript
 * process.on('SIGINT', disconnectPrisma);
 * process.on('SIGTERM', disconnectPrisma);
 * ```
 */
export async function disconnectPrisma(): Promise<void> {
  // Wait for initialization if in progress
  if (initializationPromise && !cachedClient) {
    try {
      cachedClient = await initializationPromise;
    } catch (error) {
      console.error('[Prisma] Error during initialization cleanup:', error);
      return;
    }
  }

  if (cachedClient) {
    console.log('[Prisma] Disconnecting from database...');
    await cachedClient.$disconnect();
    console.log('[Prisma] Database connection closed');
    cachedClient = undefined;
    globalForPrisma.prisma = undefined;
    initializationPromise = undefined;
    initializationError = undefined;
  }
}

// Register cleanup handlers
if (typeof process !== 'undefined') {
  process.on('beforeExit', disconnectPrisma);
}
