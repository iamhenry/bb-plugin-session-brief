import { defineRpcContract } from "@get-bb/plugin-sdk";
import { z } from "zod";

export const gitPathSchema = z
  .string()
  .min(1)
  .refine((path) => {
    if (path.includes("\0") || path.startsWith("/") || path.startsWith("\\")) {
      return false;
    }
    if (/^[A-Za-z]:[\\/]/.test(path)) return false;
    return !path.split(/[\\/]/).includes("..");
  }, "Expected a relative Git path");

export const gitMutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.enum(["stage", "unstage", "discard"]),
    path: gitPathSchema,
  }),
  z.object({ action: z.enum(["stage_all", "unstage_all", "discard_all"]) }),
]);

export const gitHostContract = defineRpcContract({
  status: {
    input: z.object({ workspacePath: z.string().min(1) }),
    output: z.array(
      z.object({
        path: z.string(),
        originalPath: z.string().nullable(),
        status: z.string(),
        staged: z.boolean(),
        unstaged: z.boolean(),
        untracked: z.boolean(),
      }),
    ),
  },
  mutate: {
    input: z.object({ workspacePath: z.string().min(1) }).and(gitMutationSchema),
    output: z.null(),
  },
});

export type GitMutation = z.infer<typeof gitMutationSchema>;
