import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 5000),
  mongoUri: required('MONGO_URI'),
  jwtSecret: required('JWT_SECRET'),
  totpKey: Buffer.from(required('TOTP_ENC_KEY'), 'hex'),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  isProd: process.env.NODE_ENV === 'production',
};

if (config.jwtSecret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
if (config.totpKey.length !== 32) throw new Error('TOTP_ENC_KEY must be 32 bytes (64 hex characters)');