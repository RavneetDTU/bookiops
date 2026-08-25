import dotenv from 'dotenv';

dotenv.config();

function required(name, fallback) {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`Missing required env: ${name}`);
  }
  return v;
}

export const config = {
  port: Number(process.env.PORT || 5050),
  adminJwtSecret: required('ADMIN_JWT_SECRET', 'dev-admin-jwt-secret-change-in-prod!!'),
  adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '8h',
  restaurantJwtSecret: required('RESTAURANT_JWT_SECRET', 'dev-restaurant-jwt-secret-change!!'),
  restaurantJwtExpiresIn: process.env.RESTAURANT_JWT_EXPIRES_IN || '2h',
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL || 'admin@booki.co.za',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD || 'ChangeMeAdmin123!',
  seedAdminName: process.env.SEED_ADMIN_NAME || 'BookiOps Admin',
  phoneApiBaseUrl: (process.env.PHONE_API_BASE_URL || 'http://localhost:5014').replace(/\/$/, ''),
  internalApiKey: required('INTERNAL_API_KEY', 'dev-internal-api-key-change-in-prod'),
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};
