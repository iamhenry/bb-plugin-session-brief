import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { mutateGit, parsePorcelain } from "../host.ts";
import { gitPathSchema } from "../host-contract.ts";

const repos: string[] = [];

function repo() {
  const cwd = mkdtempSync(join(tmpdir(), "session-brief-git-"));
  repos.push(cwd);
  execFileSync("git", ["init", "-q"], { cwd });
  execFileSync("git", ["config", "user.email", "test@example.invalid"], { cwd });
  execFileSync("git", ["config", "user.name", "Test"], { cwd });
  writeFileSync(join(cwd, "tracked.txt"), "before\n");
  execFileSync("git", ["add", "tracked.txt"], { cwd });
  execFileSync("git", ["commit", "-qm", "initial"], { cwd });
  return cwd;
}

function status(cwd: string) {
  return parsePorcelain(execFileSync(
    "git",
    ["status", "--porcelain=v1", "-z", "--untracked-files=all"],
    { cwd, encoding: "utf8" },
  ));
}

afterEach(() => {
  for (const cwd of repos.splice(0)) rmSync(cwd, { recursive: true, force: true });
});

describe("Git host actions", () => {
  it("stages and unstages one file", async () => {
    const cwd = repo();
    writeFileSync(join(cwd, "tracked.txt"), "after\n");
    await mutateGit(cwd, { action: "stage", path: "tracked.txt" });
    assert.equal(status(cwd)[0]?.staged, true);
    await mutateGit(cwd, { action: "unstage", path: "tracked.txt" });
    assert.equal(status(cwd)[0]?.unstaged, true);
    assert.equal(status(cwd)[0]?.staged, false);
  });

  it("stages and unstages all files", async () => {
    const cwd = repo();
    writeFileSync(join(cwd, "tracked.txt"), "after\n");
    writeFileSync(join(cwd, "new.txt"), "new\n");
    await mutateGit(cwd, { action: "stage_all" });
    assert.equal(status(cwd).every((file) => file.staged), true);
    await mutateGit(cwd, { action: "unstage_all" });
    assert.equal(status(cwd).every((file) => !file.staged), true);
  });

  it("discards tracked and untracked changes", async () => {
    const cwd = repo();
    writeFileSync(join(cwd, "tracked.txt"), "after\n");
    writeFileSync(join(cwd, "new.txt"), "new\n");
    await mutateGit(cwd, { action: "discard", path: "tracked.txt" });
    await mutateGit(cwd, { action: "discard", path: "new.txt" });
    assert.equal(readFileSync(join(cwd, "tracked.txt"), "utf8"), "before\n");
    assert.deepEqual(status(cwd), []);
  });

  it("discards all staged and untracked changes", async () => {
    const cwd = repo();
    writeFileSync(join(cwd, "tracked.txt"), "after\n");
    writeFileSync(join(cwd, "new.txt"), "new\n");
    await mutateGit(cwd, { action: "stage_all" });
    await mutateGit(cwd, { action: "discard_all" });
    assert.equal(readFileSync(join(cwd, "tracked.txt"), "utf8"), "before\n");
    assert.deepEqual(status(cwd), []);
  });

  it("discards a staged rename", async () => {
    const cwd = repo();
    execFileSync("git", ["mv", "tracked.txt", "renamed.txt"], { cwd });
    assert.deepEqual(status(cwd).map(({ path, originalPath }) => ({ path, originalPath })), [
      { path: "renamed.txt", originalPath: "tracked.txt" },
    ]);
    await mutateGit(cwd, { action: "discard", path: "renamed.txt" });
    assert.equal(readFileSync(join(cwd, "tracked.txt"), "utf8"), "before\n");
    assert.deepEqual(status(cwd), []);
  });

  it("rejects paths outside the workspace", () => {
    assert.equal(gitPathSchema.safeParse("../outside").success, false);
    assert.equal(gitPathSchema.safeParse("/outside").success, false);
  });
});
