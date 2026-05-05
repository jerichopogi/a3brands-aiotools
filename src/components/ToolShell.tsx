import Link from "next/link";
import type { ToolDef } from "@/lib/tools";
import AppShell from "./AppShell";

export default function ToolShell({
  tool,
  children,
}: {
  tool: ToolDef;
  children: React.ReactNode;
}) {
  return (
    <AppShell>
      <div className="mb-8 flex flex-col gap-4">
        <Link
          href="/"
          className="self-start text-xs uppercase tracking-[0.2em] text-[var(--color-text-dim)] hover:text-[var(--color-text)]"
        >
          ← All tools
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-5xl md:text-6xl text-[var(--color-text)]">{tool.title}</h1>
            <p className="mt-3 max-w-2xl text-[15px] text-[var(--color-text-muted)]">{tool.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="pill">{tool.category}</span>
            {tool.badge === "ml" && <span className="pill">ML model</span>}
            {tool.badge === "server" && <span className="pill">Server route</span>}
            {tool.badge === "beta" && <span className="pill">Beta</span>}
          </div>
        </div>
      </div>
      {children}
    </AppShell>
  );
}
