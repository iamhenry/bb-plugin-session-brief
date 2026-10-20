import { useEffect, useRef, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { usePortalScopeProps } from "../../../lib/portal-scope";

export type FileMenuItem =
  | { kind: "item"; label: string; onSelect: () => void }
  | { kind: "separator" };

/**
 * Plugin-owned right-click menu for dirty-file rows. BB's built-in FileLink
 * menu shows "Open with" items that BB 0.46 cannot open from a plugin, so the
 * brief lists only actions the plugin SDK can actually perform.
 */
export function FileContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: FileMenuItem[];
  /** `restoreFocus` is true when the keyboard dismissed the menu. */
  onClose: (restoreFocus?: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const portalScope = usePortalScopeProps();
  // Live brief updates re-render the parent; keep the effect from re-running.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    // Keep the menu on screen.
    const rect = menu.getBoundingClientRect();
    menu.style.left = `${Math.max(4, Math.min(x, window.innerWidth - rect.width - 4))}px`;
    menu.style.top = `${Math.max(4, Math.min(y, window.innerHeight - rect.height - 4))}px`;
    menu.querySelector<HTMLButtonElement>("[role=menuitem]")?.focus();

    const close = () => closeRef.current();
    const closeOutside = (event: Event) => {
      if (!menu.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", closeOutside, true);
    window.addEventListener("resize", close);
    window.addEventListener("blur", close);
    return () => {
      document.removeEventListener("pointerdown", closeOutside, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("blur", close);
    };
  }, [x, y]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" || event.key === "Tab") {
      event.preventDefault();
      onClose(true);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const buttons = Array.from(
      ref.current?.querySelectorAll<HTMLButtonElement>("[role=menuitem]") ?? [],
    );
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const step = event.key === "ArrowDown" ? 1 : -1;
    buttons[(index + step + buttons.length) % buttons.length]?.focus();
  };

  return createPortal(
    <div
      {...portalScope}
      ref={ref}
      role="menu"
      onKeyDown={onKeyDown}
      onContextMenu={(event) => event.preventDefault()}
      style={{ left: x, top: y }}
      className="fixed z-[1000] min-w-44 rounded-md border border-border bg-card p-1 text-[12px] text-foreground shadow-md outline-none"
    >
      {items.map((item, index) =>
        item.kind === "separator" ? (
          <div key={`sep-${index}`} role="separator" className="-mx-1 my-1 h-px bg-border" />
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            onClick={() => {
              onClose();
              item.onSelect();
            }}
            className="flex w-full items-center rounded px-2 py-1 text-left hover:bg-state-hover focus:bg-state-hover focus:outline-none"
          >
            {item.label}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}
