import { useState } from "react";
import { useRpc } from "@get-bb/plugin-sdk/app";
import type { DirtyFile, ProjectBrief } from "../../../contract";
import type { rpcContract } from "../../../server";
import { Icon } from "@/components/ui/icon";
import { SectionHeader } from "../SectionHeader";

function DirtyRow({
  file,
  onOpen,
  onAction,
  pending,
  actionsEnabled,
}: {
  file: DirtyFile;
  onOpen?: (file: DirtyFile) => void;
  onAction: (action: "stage" | "unstage" | "discard", file: DirtyFile) => void;
  pending: boolean;
  actionsEnabled: boolean;
}) {
  const plus = file.insertions;
  const minus = file.deletions;
  const nameStart = file.path.lastIndexOf("/") + 1;
  return (
    <div className="group relative rounded-md hover:bg-state-hover focus-within:bg-state-hover">
      <button
        type="button"
        onClick={() => onOpen?.(file)}
        className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[11px] leading-4 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      >
        <span className="w-3.5 shrink-0 text-center font-medium tabular-nums text-muted-foreground">
          {file.status}
        </span>
        <span className="flex min-w-0 flex-1 text-foreground" title={file.path}>
          {nameStart > 0 ? (
            <span className="min-w-0 truncate text-muted-foreground [direction:rtl] [unicode-bidi:plaintext]">
              {file.path.slice(0, nameStart)}
            </span>
          ) : null}
          <span className="shrink-0 text-foreground">
            {file.path.slice(nameStart)}
          </span>
        </span>
        {plus !== null && minus !== null ? (
          <span
            className={`shrink-0 whitespace-nowrap tabular-nums text-muted-foreground${actionsEnabled ? " group-hover:opacity-0 group-focus-within:opacity-0" : ""}`}
          >
            <span className="text-primary">+{plus}</span>
            <span> / </span>
            <span className="text-destructive">−{minus}</span>
          </span>
        ) : null}
      </button>
      {actionsEnabled ? (
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-0.5 bg-state-hover px-0.5 opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
          <button
            type="button"
            disabled={pending}
            onClick={() => onAction(file.staged ? "unstage" : "stage", file)}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            aria-label={`${file.staged ? "Unstage" : "Stage"} ${file.path}`}
            title={file.staged ? "Unstage" : "Stage"}
          >
            <Icon
              name={file.staged ? "ArrowTurnBackward" : "Plus"}
              className="size-3"
              aria-hidden
            />
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => onAction("discard", file)}
            className="rounded p-0.5 text-muted-foreground hover:text-destructive focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
            aria-label={`Discard changes to ${file.path}`}
            title="Discard changes"
          >
            <Icon name="ArrowTurnBackward" className="size-3" aria-hidden />
          </button>
        </span>
      ) : null}
    </div>
  );
}

export function ProjectSection({
  project,
  onOpenDirtyFile,
}: {
  project: ProjectBrief;
  onOpenDirtyFile?: (file: DirtyFile) => void;
}) {
  const rpc = useRpc<typeof rpcContract>();
  const [collapsed, setCollapsed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const branchLabel = project.branch
    ? project.branch
    : project.git
      ? "Detached"
      : null;
  const dirty = project.dirtyFiles;
  const mutate = async (
    action: "stage" | "unstage" | "discard" | "stage_all" | "unstage_all",
    file?: DirtyFile,
  ) => {
    if (!project.environmentId || pending) return;
    if (action === "discard" && file && !window.confirm(
      `Discard all changes to ${file.path}? This cannot be undone.`,
    )) return;
    setPending(true);
    setError(null);
    try {
      if (file && action !== "stage_all" && action !== "unstage_all") {
        await rpc.call("mutateGit", {
          environmentId: project.environmentId,
          action,
          path: file.path,
        });
      } else if (!file && (action === "stage_all" || action === "unstage_all")) {
        await rpc.call("mutateGit", {
          environmentId: project.environmentId,
          action,
        });
      }
    } catch {
      setError("Git action failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="border-t border-border px-2.5 py-1 pb-2">
      <SectionHeader
        title="Project"
        accessory={project.name}
        collapsible
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />
      {!collapsed && branchLabel ? (
        <div className="flex items-center gap-1.5 px-1 py-1 text-[11px] leading-4 text-muted-foreground">
          <Icon name="GitBranch" className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{branchLabel}</span>
          {project.ahead > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums" title={`${project.ahead} to push`}>
              <Icon name="ArrowUp" className="size-3" aria-hidden />
              {project.ahead}
            </span>
          ) : null}
          {project.behind > 0 ? (
            <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums" title={`${project.behind} to pull`}>
              <Icon name="ArrowDown" className="size-3" aria-hidden />
              {project.behind}
            </span>
          ) : null}
        </div>
      ) : null}
      {!collapsed && dirty.length > 0 ? (
        <>
          <div className="max-h-40 overflow-y-auto">
            {dirty.map((file) => (
              <DirtyRow
                key={file.path}
                file={file}
                onOpen={onOpenDirtyFile}
                onAction={(action, target) => void mutate(action, target)}
                pending={pending}
                actionsEnabled={project.gitActions}
              />
            ))}
          </div>
          <div
            className="mt-1 flex items-center gap-1.5 px-1 text-[11px] leading-4 text-muted-foreground"
            aria-label={`${dirty.length} ${dirty.length === 1 ? "file" : "files"}${
              project.insertions > 0 || project.deletions > 0
                ? `, +${project.insertions} −${project.deletions}`
                : ""
            }`}
          >
            <Icon name="FileDiff" className="size-3 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 tabular-nums">
              {dirty.length} {dirty.length === 1 ? "file" : "files"}
            </span>
            {project.gitActions ? (
              <span className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void mutate("stage_all")}
                  className="rounded p-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  aria-label="Stage all files"
                  title="Stage all"
                >
                  <Icon name="Plus" className="size-3" aria-hidden />
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void mutate("unstage_all")}
                  className="rounded p-0.5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                  aria-label="Unstage all files"
                  title="Unstage all"
                >
                  <Icon name="ArrowTurnBackward" className="size-3" aria-hidden />
                </button>
              </span>
            ) : null}
            {project.insertions > 0 || project.deletions > 0 ? (
              <span className="shrink-0 whitespace-nowrap tabular-nums">
                <span className="text-primary">+{project.insertions}</span>
                <span> </span>
                <span className="text-destructive">−{project.deletions}</span>
              </span>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="px-1 text-[10px] text-destructive">
              {error}
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
