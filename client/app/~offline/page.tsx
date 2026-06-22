export default function OfflinePage() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen gap-4"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden>
        <circle cx="32" cy="32" r="30" stroke="var(--color-border)" strokeWidth="2" />
        <path d="M20 44 L44 20" stroke="var(--color-text-muted)" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M16 36a20 20 0 0 1 28-18" stroke="var(--color-text-muted)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <path d="M24 44a12 12 0 0 1 16-12" stroke="var(--color-text-muted)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="32" cy="44" r="3" fill="var(--color-text-muted)" />
      </svg>
      <h1 className="text-xl font-semibold">You&apos;re offline</h1>
      <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
        Check your connection. Any edits made will sync when you reconnect.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-4 py-2 rounded-xl text-sm font-medium cursor-pointer"
        style={{ background: "var(--color-primary)", color: "#fff" }}
      >
        Try again
      </button>
    </div>
  );
}
