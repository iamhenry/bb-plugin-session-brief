/** Environment hub changes that mean git status / branch may have moved. */
export const PROJECT_ENVIRONMENT_CHANGES = new Set([
  "work-status-changed",
  "git-refs-changed",
  "status-changed",
]);

/** Thread event types that usually precede a working-tree change. */
export const PROJECT_THREAD_EVENT_TYPES = new Set([
  "item/fileChange/outputDelta",
  "turn/diff/updated",
]);

export function isProjectEnvironmentChange(
  changes: readonly string[] | undefined,
): boolean {
  if (!changes) return false;
  return changes.some((change) => PROJECT_ENVIRONMENT_CHANGES.has(change));
}

export function isProjectThreadChange(args: {
  changes?: readonly string[];
  eventTypes?: readonly string[];
}): boolean {
  if (args.changes?.includes("environment-changed")) return true;
  if (!args.changes?.includes("events-appended")) return false;
  return (args.eventTypes ?? []).some((type) =>
    PROJECT_THREAD_EVENT_TYPES.has(type),
  );
}
