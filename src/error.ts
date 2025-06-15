import { Type } from ".";

export class FieldTypeMismatchError extends Error {
    public readonly key: string;
    public readonly type: Type;
    public readonly value?: unknown;

    constructor(key: string, type: Type, value?: unknown) {
        const message = `Validation error for field "${key}" of type "${type.toString()}": ${value !== undefined ? `got value: ${JSON.stringify(value)}` : 'No value provided'}`;
        super(message);
        this.key = key;
        this.type = type;
        this.value = value;
        this.name = 'FieldValidationError';
    }
}

export class FieldNonNullableError extends Error {
    public readonly key: string;

    constructor(key: string) {
        const message = `Field "${key}" is required but was not provided.`;
        super(message);
        this.key = key;
        this.name = 'FieldNonNullableError';
    }
}

export class UnexpectedFieldError extends Error {
    public readonly key: string;

    constructor(key: string) {
        const message = `Unexpected field "${key}" found in the object.`;
        super(message);
        this.key = key;
        this.name = 'UnexpectedFieldError';
    }
}

type FieldValidationError = FieldTypeMismatchError | FieldNonNullableError | UnexpectedFieldError;

export function isFieldValidationError(error: unknown): error is FieldValidationError {
    return error instanceof FieldTypeMismatchError ||
           error instanceof FieldNonNullableError ||
           error instanceof UnexpectedFieldError;
}

export class ValidationError extends Error {
    public readonly error: FieldValidationError;

    constructor(error: FieldValidationError) {
        const message = `Validation error: ${error.message}`;
        super(message);
        this.error = error;
        this.name = 'ValidationError';
    }
}