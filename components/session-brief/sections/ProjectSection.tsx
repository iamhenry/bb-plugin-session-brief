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
          <span className="truncate">{branchLabel}</span>
        </div>
      ) : null}
      {dirty.length > 0 ? (
        <div className="max-h-40 overflow-y-auto">
          {dirty.map((file) => (
            <DirtyRow key={file.path} file={file} onOpen={onOpenDirtyFile} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
