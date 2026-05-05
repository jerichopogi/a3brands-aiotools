import { notFound } from "next/navigation";
import { getTool, TOOLS } from "@/lib/tools";
import ToolShell from "@/components/ToolShell";
import { TOOL_COMPONENTS } from "@/components/tools/registry";

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();

  const Tool = TOOL_COMPONENTS[slug as keyof typeof TOOL_COMPONENTS];
  if (!Tool) notFound();

  return (
    <ToolShell tool={tool}>
      <Tool />
    </ToolShell>
  );
}
