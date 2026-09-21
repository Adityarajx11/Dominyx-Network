'use client';

import { useState } from 'react';

export default function LoginButton({ className, children }) {
  const [busy, setBusy] = useState(false);

  return (
    <a
      className={className}
      href="/api/auth/login"
      aria-disabled={busy}
      onClick={() => setBusy(true)}
      style={busy ? { opacity: 0.6, pointerEvents: 'none' } : undefined}
    >
      {busy ? 'Redirecting to Discord…' : children}
    </a>
  );
}
