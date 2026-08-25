import type { DirtyFile, ProjectBrief } from "../../../contract";
import { Icon } from "@/components/ui/icon";
import { SectionHeader } from "../SectionHeader";

function DirtyRow({
  file,
  onOpen,
}: {
  file: DirtyFile;
  onOpen?: (file: DirtyFile) => void;
}) {
  const plus = file.insertions;
  const minus = file.deletions;
  const nameStart = file.path.lastIndexOf("/") + 1;
  return (
    <button
      type="button"
      onClick={() => onOpen?.(file)}
      className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left text-[11px] leading-4 hover:bg-state-hover"
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
        <span className="shrink-0 text-foreground">{file.path.slice(nameStart)}</span>
      </span>
      {plus !== null && minus !== null ? (
        <span className="shrink-0 whitespace-nowrap tabular-nums text-muted-foreground">
          <span className="text-primary">+{plus}</span>
          <span> / </span>
          <span className="text-destructive">−{minus}</span>
        </span>
      ) : null}
    </button>
  );
}

export function ProjectSection({
  project,
  onOpenDirtyFile,
}: {
  project: ProjectBrief;
  onOpenDirtyFile?: (file: DirtyFile) => void;
}) {
  const branchLabel = project.branch
    ? project.branch
    : project.git
      ? "Detached"
      : null;
  const dirty = project.dirtyFiles;

  return (
    <section className="border-t border-border px-2.5 py-1 pb-2">
      <SectionHeader title="Project" accessory={project.name} />
      {branchLabel ? (
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
      {dirty.length > 0 ? (
        <>
          <div className="max-h-40 overflow-y-auto">
            {dirty.map((file) => (
              <DirtyRow key={file.path} file={file} onOpen={onOpenDirtyFile} />
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
            {project.insertions > 0 || project.deletions > 0 ? (
              <span className="shrink-0 whitespace-nowrap tabular-nums">
                <span className="text-primary">+{project.insertions}</span>
                <span> </span>
                <span className="text-destructive">−{project.deletions}</span>
              </span>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
