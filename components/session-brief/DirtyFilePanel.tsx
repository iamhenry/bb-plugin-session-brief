import { useEffect, useState } from "react";
import {
  experimental_Diff as Diff,
  experimental_SourceCode as SourceCode,
  useRpc,
} from "@get-bb/plugin-sdk/app";
import type { JsonValue } from "@get-bb/plugin-sdk/app";
import type { rpcContract } from "../../server";

function paramsOf(
  params: JsonValue | null,
): { path: string; environmentId: string } | null {
  if (typeof params !== "object" || params === null || Array.isArray(params)) {
    return null;
  }
  const path = params.path;
  const environmentId = params.environmentId;
  if (typeof path !== "string" || typeof environmentId !== "string") return null;
  if (!path || !environmentId) return null;
  return { path, environmentId };
}

export function DirtyFilePanel({
  params,
}: {
  threadId: string;
  params: JsonValue | null;
}) {
  const rpc = useRpc<typeof rpcContract>();
  const parsed = paramsOf(params);
  const [patch, setPatch] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!parsed) {
      setError("Missing file path");
      return;
    }
    let cancelled = false;
    void rpc
      .call("getDirtyFile", {
        environmentId: parsed.environmentId,
        path: parsed.path,
      })
      .then((result) => {
        if (cancelled) return;
        if (result.kind === "diff") {
          setPatch(result.patch);
          setContent(null);
          setError(null);
          return;
        }
        if (result.kind === "file") {
          setContent(result.content);
          setPatch(null);
          setError(null);
          return;
        }
        setError("Could not open this file");
      })
      .catch(() => {
        if (!cancelled) setError("Could not open this file");
      });
    return () => {
      cancelled = true;
    };
  }, [parsed?.environmentId, parsed?.path, rpc]);

  if (error) {
    return (
      <p className="p-3 text-[11px] text-muted-foreground">{error}</p>
    );
  }
  if (patch) {
    return (
      <Diff
        patch={patch}
        path={parsed?.path ?? "file"}
        overflow="scroll"
        className="h-full"
      />
    );
  }
  if (content !== null) {
    return (
      <SourceCode
        content={content}
        path={parsed?.path ?? "file"}
        overflow="scroll"
        className="h-full"
      />
    );
  }
  return (
    <p className="p-3 text-[11px] text-muted-foreground">Loading…</p>
  );
}
