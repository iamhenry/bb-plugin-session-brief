import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { experimental_defineHostEntry } from "@get-bb/plugin-sdk/host";
import { gitHostContract, type GitMutation } from "./host-contract.ts";

const exec = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await exec("git", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout;
}

export function parsePorcelain(output: string) {
  const entries = output.split("\0");
  const files: {
    path: string;
    originalPath: string | null;
    status: string;
    staged: boolean;
    unstaged: boolean;
    untracked: boolean;
  }[] = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) continue;
    const x = entry[0] ?? " ";
    const y = entry[1] ?? " ";
    const path = entry.slice(3);
    const untracked = x === "?" && y === "?";
    const originalPath =
      x === "R" || x === "C" ? entries[index + 1] ?? null : null;
    files.push({
      path,
      originalPath,
      status: untracked ? "?" : y !== " " ? y : x,
      staged: !untracked && x !== " ",
      unstaged: untracked || y !== " ",
      untracked,
    });
    if (originalPath !== null) index += 1;
  }
  return files;
}

async function hasHead(cwd: string): Promise<boolean> {
  return git(cwd, ["rev-parse", "--verify", "HEAD"]).then(
    () => true,
    () => false,
  );
}

export async function mutateGit(cwd: string, mutation: GitMutation) {
  if (mutation.action === "stage") {
    await git(cwd, ["add", "-A", "--", mutation.path]);
    return;
  }
  if (mutation.action === "stage_all") {
    await git(cwd, ["add", "-A"]);
    return;
  }

  const head = await hasHead(cwd);
  if (mutation.action === "unstage") {
    await git(
      cwd,
      head
        ? ["reset", "-q", "HEAD", "--", mutation.path]
        : ["rm", "--cached", "-r", "--", mutation.path],
    );
    return;
  }
  if (mutation.action === "unstage_all") {
    await git(
      cwd,
      head
        ? ["reset", "-q", "HEAD", "--", "."]
        : ["rm", "--cached", "-r", "--", "."],
    );
    return;
  }
  if (mutation.action === "discard_all") {
    if (head) {
      await git(cwd, [
        "restore",
        "--source=HEAD",
        "--staged",
        "--worktree",
        "--",
        ".",
      ]);
    } else {
      await git(cwd, ["rm", "--cached", "-r", "--", "."]);
    }
    await git(cwd, ["clean", "-fd"]);
    return;
  }

  const status = parsePorcelain(
    await git(cwd, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]),
  ).find((file) => file.path === mutation.path);
  if (!status) return;
  if (status.untracked) {
    await git(cwd, ["clean", "-fd", "--", mutation.path]);
  } else if (head) {
    await git(cwd, [
      "restore",
      "--source=HEAD",
      "--staged",
      "--worktree",
      "--",
      mutation.path,
      ...(status.status === "R" && status.originalPath
        ? [status.originalPath]
        : []),
    ]);
  } else {
    await git(cwd, ["rm", "--cached", "-r", "--", mutation.path]);
    await git(cwd, ["clean", "-fd", "--", mutation.path]);
  }
}

export default experimental_defineHostEntry({
  contract: gitHostContract,
  handlers: {
    status: async ({ workspacePath }) =>
      parsePorcelain(
        await git(workspacePath, [
          "status",
          "--porcelain=v1",
          "-z",
          "--untracked-files=all",
        ]),
      ),
    mutate: async ({ workspacePath, ...mutation }) => {
      await mutateGit(workspacePath, mutation);
      return null;
    },
  },
});
