import { useTheme } from '../hooks/useTheme';
import Logo from './logo';

interface Props {
  unlocked: boolean;
  onLock: () => void;
  embedded?: boolean; // true = shown inside the login card
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

export default function Header({ unlocked, onLock, embedded = false }: Props) {
  const { theme, toggle } = useTheme();
  const toDark = theme === 'light';

  return (
    <header className={embedded ? 'topbar embedded' : 'topbar'}>
      <div className="topbar-inner">
        <div className="brand">
          <Logo size={34} />
          <div>
            <span className="brand-name">Vaultify</span>
            <span className="brand-tag">Zero-knowledge password manager</span>
          </div>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="icon-btn"
            onClick={toggle}
            aria-label={toDark ? 'Switch to dark mode' : 'Switch to light mode'}
            title={toDark ? 'Dark mode' : 'Light mode'}
          >
            {toDark ? <MoonIcon /> : <SunIcon />}
          </button>
          {unlocked && (
            <button type="button" onClick={onLock}>
              Lock vault
            </button>
          )}
        </div>
      </div>
    </header>
  );
}