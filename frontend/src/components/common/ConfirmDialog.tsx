import { DangerButton, SecondaryButton } from "./Buttons";
import { CommonModal } from "./CommonModal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) => (
  <CommonModal
    footer={
      <>
        <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
        <DangerButton loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </DangerButton>
      </>
    }
    onClose={onClose}
    open={open}
    title={title}
  >
    <p className="text-sm leading-6 text-app-muted">{description}</p>
  </CommonModal>
);
