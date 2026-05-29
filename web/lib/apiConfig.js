/**
 * Centralized API configuration for Web.
 * In development, falls back to localhost.
 * In production, set NEXT_PUBLIC_API_URL in Vercel/hosting dashboard.
 */
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
