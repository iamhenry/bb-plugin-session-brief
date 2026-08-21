import type { ProjectBrief } from "../../../contract";
import { Icon } from "@/components/ui/icon";
import { SectionHeader } from "../SectionHeader";

export function ProjectSection({ project }: { project: ProjectBrief }) {
  const branchLabel = project.branch
    ? project.branch
    : project.git
      ? "Detached"
      : null;

  return (
    <section className="border-t border-border px-2.5 py-1 pb-2">
      <SectionHeader title="Project" accessory={project.name} />
      {branchLabel ? (
        <div className="flex items-center gap-1.5 px-1 py-1 text-[11px] leading-4 text-muted-foreground">
          <Icon name="GitBranch" className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">{branchLabel}</span>
        </div>
      ) : null}
    </section>
  );
}
