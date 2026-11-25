export default function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Vaultify logo">
      <path d="M16 2 4 7v8c0 7.5 5 13.5 12 15 7-1.5 12-7.5 12-15V7L16 2z" fill="var(--brand)" />
      <circle cx="16" cy="13" r="3.5" fill="var(--panel)" />
      <path d="M14.4 15.5h3.2l1 6.5h-5.2z" fill="var(--panel)" />
    </svg>
  );
}