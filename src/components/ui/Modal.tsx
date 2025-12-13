import { ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

let openModalCount = 0;
const EXIT_ANIMATION_MS = 160;

const lockBodyScroll = () => {
  openModalCount += 1;
  document.body.classList.add("modal-open");
};

const unlockBodyScroll = () => {
  openModalCount = Math.max(0, openModalCount - 1);
  if (openModalCount === 0) {
    document.body.classList.remove("modal-open");
  }
};

const getFocusableElements = (root: HTMLElement | null) => {
  if (!root) return [];
  const selector = [
    'a[href]:not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  return Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true",
  );
};

export type ModalSize = "sm" | "md" | "lg" | "xl";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  className?: string;
  overlayClassName?: string;
  canClose?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
};

function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
  overlayClassName,
  canClose = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  initialFocusRef,
}: Props) {
  const [present, setPresent] = useState(open);
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const maxWidthClass = useMemo(() => {
    switch (size) {
      case "sm":
        return "max-w-md";
      case "md":
        return "max-w-xl";
      case "lg":
        return "max-w-3xl";
      case "xl":
        return "max-w-4xl";
      default:
        return "max-w-xl";
    }
  }, [size]);

  useEffect(() => {
    if (open) {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      setPresent(true);
      return;
    }

    if (!present || closeTimerRef.current) return;

    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setPresent(false);
    }, EXIT_ANIMATION_MS);

    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [open, present]);

  useEffect(() => {
    if (!present) return;

    previouslyFocused.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();

    const focusTimer = window.setTimeout(() => {
      if (!openRef.current) return;
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      const focusables = getFocusableElements(dialogRef.current);
      if (focusables[0]) {
        focusables[0].focus();
        return;
      }
      dialogRef.current?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      unlockBodyScroll();
      if (previouslyFocused.current && document.contains(previouslyFocused.current)) {
        previouslyFocused.current.focus();
      }
    };
  }, [initialFocusRef, present]);

  if (!present) return null;

  const labelledBy = title ? titleId : undefined;
  const describedBy = description ? descriptionId : undefined;
  const isClosing = !open;

  return createPortal(
    <div
      className={[
        "fixed inset-0 z-[5000] flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4",
        isClosing ? "anim-overlay-out" : "anim-overlay-in",
        overlayClassName,
      ]
        .filter(Boolean)
        .join(" ")}
      onMouseDown={() => {
        if (!canClose || !closeOnOverlayClick) return;
        onOpenChange(false);
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={[
          "flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-2xl outline-none",
          isClosing ? "anim-modal-out" : "anim-modal-in",
          maxWidthClass,
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape" && closeOnEscape && canClose) {
            e.preventDefault();
            e.stopPropagation();
            onOpenChange(false);
            return;
          }

          if (e.key !== "Tab") return;
          const focusables = getFocusableElements(dialogRef.current);
          if (focusables.length === 0) {
            e.preventDefault();
            return;
          }
          const first = focusables[0];
          const last = focusables[focusables.length - 1];
          const active = document.activeElement;

          if (e.shiftKey) {
            if (active === first || !dialogRef.current?.contains(active)) {
              e.preventDefault();
              last.focus();
            }
            return;
          }

          if (active === last) {
            e.preventDefault();
            first.focus();
          }
        }}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4">
            <div>
              {title ? (
                <h3 id={titleId} className="text-lg font-semibold text-ink-900">
                  {title}
                </h3>
              ) : null}
              {description ? (
                <p id={descriptionId} className="text-sm text-ink-600">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => (canClose ? onOpenChange(false) : null)}
              className="btn btn-icon btn-muted text-lg"
              aria-label="Fermer"
              title="Fermer"
              disabled={!canClose}
            >
              ×
            </button>
          </div>
        )}

        {children != null ? (
          <div className={[title || description ? "mt-4" : "", "flex-1 overflow-auto"].join(" ").trim()}>
            {children}
          </div>
        ) : null}

        {footer ? <div className="mt-4 flex-shrink-0">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
