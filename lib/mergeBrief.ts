import type { SessionBrief } from "../contract";

/** getBrief is usage/context/children. Git dirty files come from getProject. */
export function mergeBrief(
  previous: SessionBrief,
  next: SessionBrief,
): SessionBrief {
  if (previous.threadId !== next.threadId) return next;
  const prevPrimary = previous.providers[0];
  const nextPrimary = next.providers[0];
  const keepUsage =
    prevPrimary &&
    nextPrimary &&
    prevPrimary.id === nextPrimary.id &&
    prevPrimary.windows.length > 0 &&
    nextPrimary.windows.length === 0;
  return {
    ...next,
    providers: keepUsage ? previous.providers : next.providers,
    project: {
      ...previous.project,
      name: next.project.name,
      branch: next.project.branch,
      git: next.project.git,
      environmentId: next.project.environmentId,
      gitActions:
        previous.project.environmentId === next.project.environmentId
          ? previous.project.gitActions
          : false,
    },
  };
}
