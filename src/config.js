export const DATABASE_URL = process.env.DATABASE_URL;
export const PORT = process.env.PORT || 8080;
export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRY = process.env.JWT_EXPIRY || '7d';
export const ENV = process.env.ENV || 'DEV';
export const BUCKET = process.env.BUCKET;
export const REGION = process.env.REGION;
export const ACCESS_KEY_ID = process.env.ACCESS_KEY_ID;
export const SECRET_ACCESS_KEY = process.env.SECRET_ACCESS_KEY;
export const PATH =
  process.env.ENV === 'DEV'
    ? `ws://localhost:${PORT}`
    : 'ws://api.prettyprism.com';
