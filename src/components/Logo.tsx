export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0e0e10" />
      <rect x="14" y="11" width="38" height="26" rx="4" fill="none" stroke="#6b6b73" strokeWidth="3" />
      <rect x="10" y="19" width="40" height="28" rx="4" fill="#17171a" stroke="#f2a93b" strokeWidth="3" />
      <path d="M26 27.5v12l10-6z" fill="#f2a93b" />
    </svg>
  );
}
