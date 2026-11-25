import { type FormEvent, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { login, register } from '../store/vaultSlice';

export default function AuthForm() {
  const dispatch = useAppDispatch();
  const { busy, error, needTotp, notice } = useAppSelector((s) => s.vault);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (mode === 'register') {
      if (password.length < 12) {
        setLocalError('Use at least 12 characters for your master password.');
        return;
      }
      void dispatch(register({ email, password }));
    } else {
      void dispatch(login({ email, password, totp: totp || undefined }));
    }
  };

  const message = localError ?? error;

  return (
    <form className="form" onSubmit={submit}>
      <h2>{mode === 'login' ? 'Unlock your vault' : 'Create your vault'}</h2>
      {notice && <p className="muted">{notice}</p>}

      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
      </label>
      <label>
        Master password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
        />
      </label>
      {needTotp && (
        <label>
          2FA code
          <input value={totp} onChange={(e) => setTotp(e.target.value)} inputMode="numeric" maxLength={6} autoFocus />
        </label>
      )}

      {mode === 'register' && (
        <p className="warn">
          If you forget this password, your data cannot be recovered. Nobody, including us, can reset it.
        </p>
      )}
      {message && (
        <p className="err" role="alert">
          {message}
        </p>
      )}

      <button className="primary" type="submit" disabled={busy}>
        {busy ? 'Working…' : mode === 'login' ? 'Unlock vault' : 'Create vault'}
      </button>
      <button
        className="link"
        type="button"
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setLocalError(null);
        }}
      >
        {mode === 'login' ? 'New here? Create a vault' : 'Have a vault? Unlock it'}
      </button>
    </form>
  );
}