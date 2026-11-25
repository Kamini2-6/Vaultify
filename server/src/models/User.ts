import { Schema, model } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    kdfSalt: { type: String, required: true }, // public salt for the client's PBKDF2
    authSalt: { type: String, required: true }, // server-side salt for hashing the Auth Key
    authHash: { type: String, required: true }, // scrypt(AuthKey), never the master password
    vault: { type: String, default: '' }, // opaque encrypted blob
    totpSecretEnc: { type: String, default: null }, // TOTP secret, encrypted at rest
    totpEnabled: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const User = model('User', userSchema);