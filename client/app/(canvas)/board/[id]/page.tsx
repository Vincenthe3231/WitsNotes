import { Sidebar } from "@/components/layout/Sidebar";
import { BoardCanvas } from "./BoardCanvas";

interface BoardPageProps {
  params: Promise<{ id: string }>;
}

export default async function BoardPage({ params }: BoardPageProps) {
  const { id } = await params;

  return (
    <div className="flex h-full">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        {/* Topbar is rendered inside BoardCanvas once board data is loaded (shows title + share button) */}
        <BoardCanvas boardId={id} />
      </div>
    </div>
  );
}
