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
            className="btn btn-muted"
            disabled={cancelDisabled}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn btn-primary"
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
