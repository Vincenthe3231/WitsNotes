import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

interface BoardPageProps {
  params: Promise<{ id: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params;

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar title={`Board ${id}`} />
        <main
          className="flex-1 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--color-canvas-from), var(--color-canvas-to))" }}
          aria-label="Infinite canvas"
        >
          {/* Canvas will mount here in Phase 1 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <p style={{ color: "var(--color-text-muted)" }} className="text-sm select-none">
              Canvas loading…
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
