import { useRef, useState } from 'react';
import { breachCount, generatePassword } from '../lib/crypto';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { type Entry, saveEntries } from '../store/vaultSlice';

const CLIPBOARD_CLEAR_MS = 20_000;
const emptyForm = { site: '', username: '', password: '' };

export default function Vault() {
  const dispatch = useAppDispatch();
  const entries = useAppSelector((s) => s.vault.entries) ?? [];
  const error = useAppSelector((s) => s.vault.error);
  const [form, setForm] = useState(emptyForm);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [breach, setBreach] = useState<Record<string, number | 'error'>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const clipTimer = useRef<number | undefined>(undefined);

  const add = async () => {
    const entry: Entry = { id: crypto.randomUUID(), ...form, site: form.site.trim() };
    await dispatch(saveEntries([...entries, entry]));
    setForm(emptyForm);
  };

  const remove = async (id: string) => {
    await dispatch(saveEntries(entries.filter((e) => e.id !== id)));
    setConfirmId(null);
  };

  const toggle = (id: string) =>
    setShown((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    window.clearTimeout(clipTimer.current);
    clipTimer.current = window.setTimeout(() => void navigator.clipboard.writeText(''), CLIPBOARD_CLEAR_MS);
    setStatus('Copied. Your clipboard will be cleared in 20 seconds.');
  };

  const check = async (entry: Entry) => {
    try {
      const count = await breachCount(entry.password);
      setBreach((b) => ({ ...b, [entry.id]: count }));
    } catch {
      setBreach((b) => ({ ...b, [entry.id]: 'error' }));
    }
  };

  return (
    <>
      <section className="panel">
        <h2>Add a password</h2>
        <div className="row">
          <input
            aria-label="Website"
            placeholder="Website"
            value={form.site}
            onChange={(e) => setForm({ ...form, site: e.target.value })}
          />
          <input
            aria-label="Username"
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            aria-label="Password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button type="button" onClick={() => setForm({ ...form, password: generatePassword() })}>
            Generate
          </button>
          <button className="primary" type="button" disabled={!form.site || !form.password} onClick={() => void add()}>
            Save
          </button>
        </div>
        {error && (
          <p className="err" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="panel">
        <h2>Your passwords</h2>
        {status && <p className="muted">{status}</p>}
        {entries.length === 0 && <p className="muted">Nothing saved yet. Add your first password above.</p>}
        {entries.map((entry) => {
          const result = breach[entry.id];
          return (
            <div className="entry" key={entry.id}>
              <div>
                <strong>{entry.site}</strong>
                <span className="muted">{entry.username}</span>
                <div className="mono">{shown.has(entry.id) ? entry.password : '••••••••••'}</div>
              </div>
              <div className="row">
                {typeof result === 'number' && result > 0 && (
                  <span className="err">Found in {result.toLocaleString()} breaches</span>
                )}
                {result === 0 && <span className="ok">Not found in known breaches</span>}
                {result === 'error' && <span className="muted">Breach check unavailable</span>}
                <button type="button" onClick={() => toggle(entry.id)}>
                  {shown.has(entry.id) ? 'Hide' : 'Show'}
                </button>
                <button type="button" onClick={() => void copy(entry.password)}>
                  Copy
                </button>
                <button type="button" onClick={() => void check(entry)}>
                  Check breaches
                </button>
                {confirmId === entry.id ? (
                  <>
                    <button type="button" className="danger" onClick={() => void remove(entry.id)}>
                      Confirm delete
                    </button>
                    <button type="button" onClick={() => setConfirmId(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setConfirmId(entry.id)}>
                    Delete
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </>
  );
}