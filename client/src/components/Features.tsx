import type { ReactNode } from 'react';

interface Feature {
  title: string;
  text: string;
  icon: ReactNode;
}

const Icon = ({ children }: { children: ReactNode }) => (
  <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

const FEATURES: Feature[] = [
  {
    title: 'Zero-knowledge encryption',
    text: 'AES-256-GCM in your browser. We never see your data.',
    icon: (
      <Icon>
        <rect x="5" y="11" width="14" height="9" rx="2" />
        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      </Icon>
    ),
  },
  {
    title: 'Password generator',
    text: 'Strong random passwords in one click.',
    icon: (
      <Icon>
        <circle cx="8" cy="15" r="4" />
        <path d="M11 12l8-8M16 7l3 3" />
      </Icon>
    ),
  },
  {
    title: 'Auto-lock',
    text: 'Your vault locks itself after inactivity.',
    icon: (
      <Icon>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l3 2M9 2h6" />
      </Icon>
    ),
  },
  {
    title: 'Two-factor login',
    text: 'Extra protection with an authenticator app.',
    icon: (
      <Icon>
        <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
        <path d="M9 12l2 2 4-4" />
      </Icon>
    ),
  },
  {
    title: 'Breach check',
    text: 'See if a password has leaked, privately.',
    icon: (
      <Icon>
        <path d="M12 3l10 18H2z" />
        <path d="M12 10v5M12 18h.01" />
      </Icon>
    ),
  },
  {
    title: 'View raw data',
    text: 'See the encrypted text the server stores.',
    icon: (
      <Icon>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </Icon>
    ),
  },
];

export default function Features() {
  return (
    <section className="features" aria-labelledby="features-title">
      <div className="features-inner">
        <h1 id="features-title">Your passwords, locked before they leave your browser.</h1>
        <p className="lead">
          Everything is encrypted on your device with your master password. Our server only ever stores unreadable
          data.
        </p>
        <div className="grid">
          {FEATURES.map((f) => (
            <div className="feat" key={f.title}>
              <div className="ico">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}