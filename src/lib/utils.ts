import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Combine and de-duplicate Tailwind class strings. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
