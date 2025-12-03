import { createPortal } from "react-dom";

type Props = {
  title: string;
  description?: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  children?: React.ReactNode;
};

function ConfirmModal({ title, description, onClose, onConfirm, confirmLabel = "Valider", children }: Props) {
  return createPortal(
    <div
      className="fixed inset-0 z-[3000] flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
            {description ? <p className="text-sm text-ink-600">{description}</p> : null}
          </div>
          <button
            type="button"
            className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold text-ink-700"
            onClick={onClose}
          >
            Fermer
          </button>
        </div>
        <div className="mt-3 max-h-96 overflow-auto">{children}</div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-ink-100 px-4 py-2 text-sm font-semibold text-ink-700"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default ConfirmModal;
