import { z } from 'zod';

export function errorMessage(error: unknown): string {
  if (error instanceof z.ZodError)
    return error.issues.map((issue) => issue.message).join(' ');
  return error instanceof Error
    ? error.message
    : 'An unexpected error occurred.';
}
