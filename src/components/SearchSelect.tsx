import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAnchorRect } from "../hooks/useAnchorRect";

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
  const anchor = useAnchorRect<HTMLInputElement>();

  useEffect(() => {
    if (focused) anchor.update();
  }, [focused, anchor]);

  return (
    <label className="block text-sm text-ink-700">
      {label}
      <div className="relative mt-1">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 100)}
          ref={anchor.ref}
          className="input"
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
              className="z-[5500] anim-popover-in max-h-48 overflow-auto rounded-lg border border-ink-100 bg-white shadow-lg"
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
