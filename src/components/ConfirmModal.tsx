import { ReactNode } from "react";
import Modal, { ModalSize } from "./ui/Modal";

type Props = {
  title: string;
  description?: string;
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  cancelDisabled?: boolean;
  canClose?: boolean;
  size?: ModalSize;
  children?: ReactNode;
};

function ConfirmModal({
  title,
  description,
  onClose,
  onConfirm,
  confirmLabel = "Valider",
  cancelLabel = "Annuler",
  confirmDisabled,
  cancelDisabled,
  canClose = true,
  size = "md",
  children,
}: Props) {
  return (
    <Modal
      open
      onOpenChange={(next) => (next ? null : onClose())}
      title={title}
      description={description}
      size={size}
      canClose={canClose}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-ink-100 px-4 py-2 text-sm font-semibold text-ink-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={cancelDisabled}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60"
            disabled={confirmDisabled}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      {children}
    </Modal>
  );
}

export default ConfirmModal;
