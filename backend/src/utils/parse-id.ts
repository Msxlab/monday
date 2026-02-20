import { AppError } from './errors';

export function parseId(value: string, paramName: string = 'id'): number {
  const parsed = parseInt(value, 10);
  if (isNaN(parsed) || parsed <= 0) {
    throw new AppError(`Invalid ${paramName}: must be a positive integer`, 400);
  }
  return parsed;
}
