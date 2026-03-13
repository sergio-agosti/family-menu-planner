import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTescoSearchUrl(query: string): string {
  return `https://www.tesco.com/groceries/en-GB/search?query=${encodeURIComponent(query.trim())}`;
}

export function getGoogleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(`site:tesco.com ${query.trim()}`)}`;
}
