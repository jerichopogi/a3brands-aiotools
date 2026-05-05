import Link from "next/link";
import AppShell from "@/components/AppShell";
import { CATEGORY_LABEL, TOOLS, type ToolCategory } from "@/lib/tools";

const CATEGORIES: ToolCategory[] = ["image", "document", "utility"];

const ACCENT_PER_CATEGORY: Record<ToolCategory, string> = {
  image: "from-[oklch(72%_0.18_145)] to-[oklch(60%_0.2_280)]",
  document: "from-[oklch(78%_0.16_60)] to-[oklch(68%_0.22_25)]",
  utility: "from-[oklch(70%_0.14_220)] to-[oklch(72%_0.18_145)]",
};

export default function Home() {
  return (
    <AppShell>
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl md:text-4xl">All-in-one converter</h1>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            Image, PDF, and document utilities for the A3 workflow.
          </p>
        </div>
        <span className="font-mono text-xs text-[var(--color-text-dim)]">
          {TOOLS.length} tools
        </span>
      </div>

      {CATEGORIES.map((cat) => {
        const list = TOOLS.filter((t) => t.category === cat);
        if (list.length === 0) return null;
        return (
          <section key={cat} id={cat} className="mb-12 scroll-mt-24">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="display text-xl">{CATEGORY_LABEL[cat]}</h2>
              <div className="text-xs text-[var(--color-text-dim)]">
                {list.length} tool{list.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((tool) => (
                <Link
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group surface relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-[var(--color-border-strong)]"
                >
                  <div
                    aria-hidden
                    className={`pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-to-br ${ACCENT_PER_CATEGORY[cat]} opacity-0 blur-2xl transition group-hover:opacity-30`}
                  />
                  <div className="relative flex h-full flex-col justify-between gap-6">
                    <div>
                      <div className="mb-3 flex items-center gap-2">
                        {tool.badge === "ml" && <span className="pill">ML</span>}
                        {tool.badge === "server" && <span className="pill">Server</span>}
                        {tool.badge === "new" && <span className="pill">New</span>}
                      </div>
                      <h3 className="display text-lg tracking-tight">{tool.title}</h3>
                      <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{tool.tagline}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--color-text-dim)]">
                      Open
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition group-hover:translate-x-1"
                      >
                        <path d="M5 12h14m-6-6 6 6-6 6" />
                      </svg>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </AppShell>
  );
}
