export class ValidationError extends Error {
    override readonly name = 'ValidationError';
}
export function required<T>(value: T | undefined | null, message = 'Required value is missing'): T {
    if (value === undefined || value === null) throw new Error(message);
    return value;
}
export function nonNegativeInteger(value: unknown, name: string): number {
    const number =
        typeof value === 'number'
            ? value
            : typeof value === 'string' && /^\d+$/.test(value)
              ? Number(value)
              : NaN;
    if (!Number.isSafeInteger(number) || number < 0)
        throw new ValidationError(`${name} must be a non-negative safe integer`);
    return number;
}
export function record(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        throw new Error('Expected an object');
    return value as Record<string, unknown>;
}
