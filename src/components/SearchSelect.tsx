import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = { id: number | string; label: string; hint?: string };

type Props = {
  label?: string;
  placeholder?: string;
  valueId?: number | string | null;
  search: string;
  onSearch: (v: string) => void;
  options: SelectOption[];
  onSelect: (opt: SelectOption | null) => void;
  allowClear?: boolean;
};

function useAnchorRect() {
  const ref = useRef<HTMLInputElement | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const update = () => {
    if (ref.current) {
      setRect(ref.current.getBoundingClientRect());
    }
  };

  useEffect(() => {
    const handler = () => update();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, []);

  return { ref, rect, update };
}

export function SearchSelect({
  label,
  placeholder,
  valueId,
  search,
  onSearch,
  options,
  onSelect,
  allowClear = true,
}: Props) {
  const [focused, setFocused] = useState(false);
  const anchor = useAnchorRect();

  useEffect(() => {
    if (focused) anchor.update();
  }, [focused, anchor]);

  return (
    <label className="text-sm text-ink-700">
      {label}
      <div className="relative mt-1">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 100)}
          ref={anchor.ref}
          className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
          placeholder={placeholder}
        />
        {allowClear && valueId ? (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onSelect(null)}
            className="absolute inset-y-0 right-2 text-xs text-ink-400 hover:text-ink-700"
          >
            ✕
          </button>
        ) : null}
      </div>
      {focused && search.trim() && anchor.rect
        ? createPortal(
            <div
              className="z-[4000] max-h-48 overflow-auto rounded-lg border border-ink-100 bg-white shadow-lg"
              style={{
                position: "fixed",
                top: (anchor.rect?.bottom ?? 0) + 4,
                left: anchor.rect?.left ?? 0,
                width: anchor.rect?.width ?? "auto",
              }}
            >
              {options.length === 0 ? (
                <p className="px-3 py-2 text-xs text-ink-500">Aucun résultat</p>
              ) : (
                options.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onSelect(opt);
                      onSearch(opt.label);
                      setFocused(false);
                    }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-ink-50 ${
                      valueId === opt.id ? "bg-ink-50" : ""
                    }`}
                  >
                    <span className="font-semibold text-ink-900">{opt.label}</span>
                    {opt.hint ? <span className="text-xs text-ink-500">{opt.hint}</span> : null}
                  </button>
                ))
              )}
            </div>,
            document.body,
          )
        : null}
    </label>
  );
}

export default SearchSelect;
