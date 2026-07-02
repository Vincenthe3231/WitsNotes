"use client";

import { useState } from "react";
import { X, UserPlus, Trash2, Crown, Eye, Pencil } from "lucide-react";
import { useBoardMembers, useInviteMember, useUpdateMemberRole, useRemoveMember } from "@/lib/api/hooks";
import { useConfirmStore } from "@/stores/confirmStore";
import type { BoardMember } from "@/lib/api/schemas";

interface Props {
  boardId: string;
  isVault: boolean;
  onClose: () => void;
}

const ROLE_ICONS: Record<string, React.ReactNode> = {
  owner:  <Crown size={13} />,
  editor: <Pencil size={13} />,
  viewer: <Eye size={13} />,
};

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner", editor: "Editor", viewer: "Viewer",
};

function MemberRow({ member, boardId, isOwner }: { member: BoardMember; boardId: string; isOwner: boolean }) {
  const updateRole = useUpdateMemberRole(boardId);
  const remove     = useRemoveMember(boardId);
  const confirm    = useConfirmStore((s) => s.confirm);

  async function handleRemove() {
    if (!member.id) return;
    const confirmed = await confirm({
      title: "Remove member",
      message: `Remove ${member.name} from this board?`,
      danger: true,
    });
    if (!confirmed) return;
    remove.mutate({ memberId: member.id });
  }

  return (
    <div
      className="flex items-center gap-3 py-2"
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      {/* Avatar */}
      <div
        className="flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0"
        style={{ width: 32, height: 32, background: "var(--color-primary)", color: "#fff" }}
      >
        {member.name.slice(0, 2).toUpperCase()}
      </div>

      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
          {member.name}
        </div>
        <div className="text-xs truncate" style={{ color: "var(--color-text-muted)" }}>
          {member.email}
        </div>
      </div>

      {/* Role control */}
      {member.role === "owner" ? (
        <div className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
          {ROLE_ICONS.owner} Owner
        </div>
      ) : isOwner ? (
        <div className="flex items-center gap-2">
          <select
            value={member.role}
            onChange={(e) => {
              if (member.id) {
                updateRole.mutate({ memberId: member.id, role: e.target.value as "editor" | "viewer" });
              }
            }}
            className="text-xs rounded px-1 py-0.5 cursor-pointer"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            aria-label={`Change role for ${member.name}`}
          >
            <option value="editor">Editor</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            onClick={handleRemove}
            className="rounded p-1 cursor-pointer transition-colors duration-150"
            style={{ color: "var(--color-text-muted)" }}
            aria-label={`Remove ${member.name}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
          {ROLE_ICONS[member.role]} {ROLE_LABEL[member.role]}
        </div>
      )}
    </div>
  );
}

export function ShareModal({ boardId, isVault, onClose }: Props) {
  const { data: members = [], isLoading } = useBoardMembers(boardId);
  const invite = useInviteMember(boardId);

  const [email, setEmail]   = useState("");
  const [role, setRole]     = useState<"editor" | "viewer">("editor");
  const [error, setError]   = useState<string | null>(null);

  const ownerEntry = members.find(m => m.role === "owner");
  const isOwner    = true; // The modal is only openable by the owner (ShareButton checks)

  const handleInvite = async () => {
    setError(null);
    if (!email.trim()) { setError("Email required."); return; }
    try {
      await invite.mutateAsync({ email: email.trim(), role });
      setEmail("");
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? "Invite failed.";
      setError(msg);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share board"
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="glass rounded-2xl shadow-2xl flex flex-col"
        style={{ width: 440, maxWidth: "90vw", maxHeight: "80vh", padding: "24px 28px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: "var(--color-text)" }}>
            Share board
          </h2>
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 cursor-pointer transition-all duration-150"
            style={{ color: "var(--color-text-muted)" }}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Vault warning */}
        {isVault && (
          <div
            className="rounded-xl px-4 py-3 mb-4 text-sm"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#ef4444" }}
            role="alert"
          >
            Vault boards cannot be shared. Remove the vault lock first.
          </div>
        )}

        {/* Invite form */}
        {!isVault && (
          <div className="flex gap-2 mb-4">
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
              className="flex-1 rounded-xl px-3 py-2 text-sm"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                outline: "none",
              }}
              aria-label="Invite by email"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "editor" | "viewer")}
              className="rounded-xl px-2 py-2 text-sm cursor-pointer"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
              aria-label="Role"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={handleInvite}
              disabled={invite.isPending}
              className="neu rounded-xl px-3 py-2 text-sm font-medium cursor-pointer transition-all duration-150 flex items-center gap-1.5"
              style={{ color: "var(--color-primary)" }}
              aria-label="Invite"
            >
              <UserPlus size={14} />
              {invite.isPending ? "…" : "Invite"}
            </button>
          </div>
        )}

        {error && (
          <p className="text-xs mb-3" style={{ color: "#ef4444" }} role="alert">{error}</p>
        )}

        {/* Member list */}
        <div className="overflow-y-auto flex-1 -mx-1 px-1">
          {isLoading ? (
            <p className="text-sm py-4 text-center" style={{ color: "var(--color-text-muted)" }}>
              Loading…
            </p>
          ) : (
            members.map((m) => (
              <MemberRow
                key={m.id ?? `owner-${m.user_id}`}
                member={m}
                boardId={boardId}
                isOwner={isOwner}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
