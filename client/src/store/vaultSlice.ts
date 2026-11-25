import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit';
import { ApiError, api } from '../lib/api';
import { decrypt, deriveKeys, encrypt, randomSalt } from '../lib/crypto';
import { session } from '../lib/session';

export interface Entry {
  id: string;
  site: string;
  username: string;
  password: string;
}

export interface VaultState {
  token: string | null;
  entries: Entry[] | null; // null means locked
  blob: string | null; // the encrypted text exactly as the server stores it
  totpEnabled: boolean;
  needTotp: boolean;
  busy: boolean;
  error: string | null;
  notice: string | null;
}

interface Credentials {
  email: string;
  password: string;
  totp?: string;
}
interface Failure {
  message: string;
  needTotp?: boolean;
}
interface Unlocked {
  token: string;
  totpEnabled: boolean;
  blob: string;
  entries: Entry[];
}

const initialState: VaultState = {
  token: null,
  entries: null,
  blob: null,
  totpEnabled: false,
  needTotp: false,
  busy: false,
  error: null,
  notice: null,
};

function toFailure(err: unknown): Failure {
  if (err instanceof ApiError) return { message: err.message, needTotp: err.code === 'TOTP_REQUIRED' };
  if (err instanceof DOMException) return { message: 'Could not decrypt the vault. The data may be damaged.' };
  return { message: err instanceof Error ? err.message : 'Something went wrong' };
}

export const register = createAsyncThunk<Unlocked, Credentials, { rejectValue: Failure }>(
  'vault/register',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const kdfSalt = randomSalt();
      const { authKey, encKey } = await deriveKeys(password, kdfSalt);
      await api.register(email, kdfSalt, authKey);
      const { token, totpEnabled } = await api.login(email, authKey);
      const blob = await encrypt(encKey, []);
      await api.putVault(token, blob);
      session.set(encKey);
      return { token, totpEnabled, blob, entries: [] };
    } catch (err) {
      return rejectWithValue(toFailure(err));
    }
  },
);

export const login = createAsyncThunk<Unlocked, Credentials, { rejectValue: Failure }>(
  'vault/login',
  async ({ email, password, totp }, { rejectWithValue }) => {
    try {
      const { kdfSalt } = await api.getSalt(email);
      const { authKey, encKey } = await deriveKeys(password, kdfSalt);
      const { token, totpEnabled } = await api.login(email, authKey, totp);
      const { blob } = await api.getVault(token);
      const entries = blob ? await decrypt<Entry[]>(encKey, blob) : [];
      session.set(encKey);
      return { token, totpEnabled, blob, entries };
    } catch (err) {
      return rejectWithValue(toFailure(err));
    }
  },
);

export const saveEntries = createAsyncThunk<{ entries: Entry[]; blob: string }, Entry[], { rejectValue: Failure }>(
  'vault/save',
  async (entries, { getState, rejectWithValue }) => {
    try {
      const { token } = (getState() as { vault: VaultState }).vault;
      if (!token) throw new Error('Not signed in');
      const blob = await encrypt(session.get(), entries); // fresh IV on every save
      await api.putVault(token, blob);
      return { entries, blob };
    } catch (err) {
      return rejectWithValue(toFailure(err));
    }
  },
);

/** Drops the key and every decrypted entry from memory. */
export const lockVault = createAsyncThunk<void, 'manual' | 'idle'>('vault/lock', async () => {
  session.clear();
});

const slice = createSlice({
  name: 'vault',
  initialState,
  reducers: {
    totpActivated(state) {
      state.totpEnabled = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(saveEntries.fulfilled, (state, { payload }) => {
        state.entries = payload.entries;
        state.blob = payload.blob;
        state.error = null;
      })
      .addCase(saveEntries.rejected, (state, action) => {
        state.error = action.payload?.message ?? 'Could not save your vault';
      })
      .addCase(lockVault.fulfilled, (_state, action) => ({
        ...initialState,
        notice: action.meta.arg === 'idle' ? 'Your vault was locked after inactivity.' : null,
      }))
      .addMatcher(isAnyOf(login.pending, register.pending), (state) => {
        state.busy = true;
        state.error = null;
        state.notice = null;
      })
      .addMatcher(isAnyOf(login.fulfilled, register.fulfilled), (state, { payload }) => {
        state.busy = false;
        state.needTotp = false;
        state.token = payload.token;
        state.totpEnabled = payload.totpEnabled;
        state.blob = payload.blob;
        state.entries = payload.entries;
      })
      .addMatcher(isAnyOf(login.rejected, register.rejected), (state, action) => {
        state.busy = false;
        state.error = action.payload?.message ?? 'Something went wrong';
        if (action.payload?.needTotp) state.needTotp = true;
      });
  },
});

export const { totpActivated } = slice.actions;
export default slice.reducer;