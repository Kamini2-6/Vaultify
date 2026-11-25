import { useCallback } from 'react';
import AuthForm from './components/AuthForm';
import Header from './components/header';
import SecurityPanel from './components/SecurityPanel';
import Vault from './components/vault';
import { useAutoLock } from './hooks/useAutoLock';
import Features from './components/Features';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { lockVault } from './store/vaultSlice';

const AUTO_LOCK_MS = 5 * 60 * 1000;

export default function App() {
  const dispatch = useAppDispatch();
  const unlocked = useAppSelector((s) => s.vault.entries !== null);

  const onIdle = useCallback(() => {
    void dispatch(lockVault('idle'));
  }, [dispatch]);
  useAutoLock(unlocked, AUTO_LOCK_MS, onIdle);

  const lock = () => void dispatch(lockVault('manual'));

    if (!unlocked) {
    return (
      <>
        <Header unlocked={false} onLock={lock} />
        <main className="split">
          <Features />
          <section className="side">
            <div className="badge">
              <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </div>
            <AuthForm />
            <p className="note">Your master password never leaves this device.</p>
          </section>
        </main>
      </>
    );
  }

  return (
    <>
      <Header unlocked onLock={lock} />
      <main>
        <Vault />
        <SecurityPanel />
      </main>
    </>
  );
}