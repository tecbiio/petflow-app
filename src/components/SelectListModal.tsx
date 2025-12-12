import { useMemo, useRef } from "react";
import Modal, { ModalSize } from "./ui/Modal";

export type SelectListOption = {
  id: number;
  label: string;
  hint?: string;
  isDefault?: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  search: string;
  onSearch: (value: string) => void;
  options: SelectListOption[];
  onSelect: (id: number) => void;
  selectedId?: number;
  emptyText?: string;
  size?: ModalSize;
};

function SelectListModal({
  open,
  onOpenChange,
  title,
  description,
  search,
  onSearch,
  options,
  onSelect,
  selectedId,
  emptyText = "Aucun résultat.",
  size = "lg",
}: Props) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const isSearchActive = search.trim().length > 0;

  const filtered = useMemo(() => {
    if (!isSearchActive) return options;
    const query = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(query) || (opt.hint?.toLowerCase().includes(query) ?? false),
    );
  }, [isSearchActive, options, search]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size={size}
      initialFocusRef={searchInputRef}
    >
      <input
        ref={searchInputRef}
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Recherche"
        className="w-full rounded-lg border border-ink-100 px-3 py-2 text-sm"
      />
      <div className="mt-3 max-h-80 space-y-2 overflow-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-ink-500">{emptyText}</p>
        ) : (
          filtered.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onSelect(opt.id);
                onOpenChange(false);
              }}
              className={[
                "flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-left text-sm font-semibold text-ink-900 transition hover:bg-ink-50",
                selectedId === opt.id ? "border-ink-900" : "border-ink-100",
              ].join(" ")}
            >
              <span>
                {opt.label}
                {opt.hint ? <span className="ml-2 text-xs font-normal text-ink-500">{opt.hint}</span> : null}
              </span>
              {opt.isDefault ? (
                <span className="rounded-full bg-brand-50 px-2 py-1 text-[11px] font-semibold text-brand-700">
                  Défaut
                </span>
              ) : null}
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}

export default SelectListModal;
