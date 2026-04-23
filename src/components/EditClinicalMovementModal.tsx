import ClinicalFinancialForm from './ClinicalFinancialForm';
import { ClinicalMovement } from '../types/clinical';

interface EditClinicalMovementModalProps {
  movement: ClinicalMovement;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditClinicalMovementModal({ movement, onClose, onSuccess }: EditClinicalMovementModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="relative max-w-4xl w-full">
        <ClinicalFinancialForm 
          initialData={movement}
          onSuccess={() => {
            onSuccess();
            onClose();
          }}
          onCancel={onClose}
        />
      </div>
    </div>
  );
}
