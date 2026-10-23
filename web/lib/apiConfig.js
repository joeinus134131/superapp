/**
 * Web API base URL. VPS production routes /api/v1 through the same reverse proxy.
 * An explicit URL remains available for deployments with a separate API host.
 */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === 'production' ? '/api/v1' : 'http://localhost:8080/api/v1')).replace(/\/+$/, '');
