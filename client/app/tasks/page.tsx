import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { AgendaView } from "@/features/agenda/AgendaView";

export default function TasksPage() {
  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Topbar title="Tasks" />
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-semibold mb-6" style={{ color: "var(--color-text)" }}>Agenda</h2>
            <AgendaView />
          </div>
        </main>
      </div>
    </div>
  );
}
