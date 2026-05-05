import Link from "next/link";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <div className="grain pointer-events-none fixed inset-0" aria-hidden />
      <header className="relative z-10 border-b border-[var(--color-border)]/60 backdrop-blur-md bg-[var(--color-bg)]/40">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative h-8 w-8 overflow-hidden rounded-lg bg-gradient-to-br from-[var(--color-accent)] to-[oklch(60%_0.2_280)]">
              <div className="absolute inset-[2px] rounded-md bg-[var(--color-bg)] grid place-items-center">
                <span className="text-[10px] font-bold tracking-tight text-[var(--color-accent)]">A3</span>
              </div>
            </div>
            <div className="leading-tight">
              <div className="text-[15px] font-semibold tracking-tight">AIO Converter</div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-dim)]">
                A3 Brands · Internal
              </div>
            </div>
          </Link>
          <nav className="hidden gap-6 text-sm text-[var(--color-text-muted)] md:flex">
            <Link href="/#image" className="hover:text-[var(--color-text)]">Image</Link>
            <Link href="/#document" className="hover:text-[var(--color-text)]">Document</Link>
            <Link href="/#utility" className="hover:text-[var(--color-text)]">Utility</Link>
          </nav>
          <div className="hidden md:flex items-center gap-2">
            <span className="pill">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] animate-pulse-soft" />
              Local · No Uploads
            </span>
          </div>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-[1400px] px-6 py-10">{children}</main>
      <footer className="relative z-10 mx-auto max-w-[1400px] px-6 py-12 text-xs text-[var(--color-text-dim)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)]/60 pt-6">
          <div>© {new Date().getFullYear()} A3 Brands · For internal use only</div>
          <div className="font-mono">v0.1 · Next 15 · Vercel</div>
        </div>
      </footer>
    </div>
  );
}
