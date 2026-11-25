import { useState } from 'react';
import { api } from '../lib/api';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { totpActivated } from '../store/vaultSlice';

export default function SecurityPanel() {
  const dispatch = useAppDispatch();
  const { token, totpEnabled, blob } = useAppSelector((s) => s.vault);
  const [setup, setSetup] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const startSetup = async () => {
    if (!token) return;
    try {
      setSetup(await api.setup2fa(token));
      setMessage(null);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not start 2FA setup');
    }
  };

  const confirm = async () => {
    if (!token) return;
    try {
      await api.enable2fa(token, code);
      dispatch(totpActivated());
      setSetup(null);
      setCode('');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Invalid code');
    }
  };

  return (
    <section className="panel">
      <h2>Security</h2>

      {totpEnabled ? (
        <p className="ok">Two-factor authentication is on.</p>
      ) : setup ? (
        <div>
          <p>Scan this QR code with your authenticator app, then enter the 6-digit code it shows.</p>
          <img src={setup.qrDataUrl} alt="2FA QR code" width={180} height={180} />
          <p className="muted">
            Can't scan? Enter this key manually: <code>{setup.secret}</code>
          </p>
          <div className="row">
            <input
              aria-label="6-digit code"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={6}
            />
            <button className="primary" type="button" onClick={() => void confirm()}>
              Confirm
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => void startSetup()}>
          Turn on two-factor authentication
        </button>
      )}
      {message && (
        <p className="err" role="alert">
          {message}
        </p>
      )}

      <hr />
      <button type="button" onClick={() => setShowRaw(!showRaw)}>
        {showRaw ? 'Hide raw data' : 'View raw data'}
      </button>
      {showRaw && (
        <>
          <p className="muted">This is exactly what the server stores. Without your master password it is unreadable.</p>
          <code className="block">{blob}</code>
        </>
      )}
    </section>
  );
}