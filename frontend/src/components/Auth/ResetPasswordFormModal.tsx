import { ResetPasswordForm } from "./ResetPasswordForm";
import { CommonModal } from "../common/CommonModal";

interface ResetPasswordFormModalProps {
  open: boolean;
  onClose: () => void;
}

export const ResetPasswordFormModal = ({
  open,
  onClose,
}: ResetPasswordFormModalProps) => (
  <CommonModal onClose={onClose} open={open} title="Reset password">
    <ResetPasswordForm />
  </CommonModal>
);
