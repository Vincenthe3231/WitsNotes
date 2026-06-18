import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default function Home() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar title="Boards" />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-5xl mx-auto">
            <p style={{ color: "var(--color-text-muted)" }} className="text-sm">
              No boards yet. Create your first board to get started.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
