/**
 * Error Utilities
 * 
 * Helpers tipados para manejo de errores que reemplazan el uso de `any`.
 * Estos utilities proporcionan type guards y funciones de extracción segura.
 */

/**
 * Type guard para verificar si un valor es un Error estándar
 */
export function isError(error: unknown): error is Error {
    return error instanceof Error;
}

/**
 * Type guard para verificar si un error tiene propiedad message
 */
export function isErrorWithMessage(error: unknown): error is { message: string } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message: unknown }).message === 'string'
    );
}

/**
 * Type guard para verificar si es un error HTTP con status
 */
export function isHttpError(error: unknown): error is { status: number; message: string } {
    return (
        typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        typeof (error as { status: unknown }).status === 'number' &&
        'message' in error &&
        typeof (error as { message: unknown }).message === 'string'
    );
}

/**
 * Type guard para errores de Prisma
 * Prisma errors include code, message, and optionally meta for constraint violations
 */
export interface PrismaClientError {
    code: string;
    message: string;
    meta?: {
        target?: string[];
        [key: string]: unknown;
    };
}

export function isPrismaError(error: unknown): error is PrismaClientError {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        typeof (error as { code: unknown }).code === 'string'
    );
}

/**
 * Obtiene el mensaje de un error de forma segura
 * Maneja Error estándar, objetos con message, y otros tipos
 */
export function getErrorMessage(error: unknown): string {
    if (isError(error)) {
        return error.message;
    }
    if (isErrorWithMessage(error)) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'An unknown error occurred';
}

/**
 * Obtiene el código de error de Prisma si existe
 */
export function getPrismaErrorCode(error: unknown): string | null {
    if (isPrismaError(error)) {
        return error.code;
    }
    return null;
}

/**
 * Obtiene el status HTTP de un error si existe
 */
export function getHttpStatus(error: unknown): number {
    if (isHttpError(error)) {
        return error.status;
    }
    // Códigos comunes de Prisma
    if (isPrismaError(error)) {
        switch (error.code) {
            case 'P2002': return 409; // Unique constraint violation
            case 'P2025': return 404; // Record not found
            case 'P2003': return 400; // Foreign key constraint
            default: return 500;
        }
    }
    return 500;
}

/**
 * Log de error con contexto para debugging
 */
export function logError(context: string, error: unknown): void {
    const message = getErrorMessage(error);
    const prismaCode = getPrismaErrorCode(error);

    if (prismaCode) {
        console.error(`[${context}] Prisma Error (${prismaCode}): ${message}`);
    } else if (isError(error)) {
        console.error(`[${context}] Error: ${message}`, error.stack);
    } else {
        console.error(`[${context}] Error:`, error);
    }
}

/**
 * Crea una respuesta de error estandarizada
 */
export interface ErrorResponse {
    error: string;
    code?: string;
    details?: string;
}

export function createErrorResponse(error: unknown, includeDetails = false): ErrorResponse {
    const response: ErrorResponse = {
        error: 'Internal server error',
    };

    if (isPrismaError(error)) {
        response.code = error.code;
        // Mensajes amigables para errores comunes de Prisma
        switch (error.code) {
            case 'P2002':
                response.error = 'A record with this value already exists';
                break;
            case 'P2025':
                response.error = 'Record not found';
                break;
            case 'P2003':
                response.error = 'Invalid reference';
                break;
        }
    }

    if (includeDetails && process.env.NODE_ENV === 'development') {
        response.details = getErrorMessage(error);
    }

    return response;
}

/**
 * Type-safe wrapper para try-catch en async functions
 */
export async function tryCatch<T>(
    fn: () => Promise<T>,
    context: string
): Promise<[T, null] | [null, unknown]> {
    try {
        const result = await fn();
        return [result, null];
    } catch (error) {
        logError(context, error);
        return [null, error];
    }
}
