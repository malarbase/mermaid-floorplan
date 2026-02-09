interface DeleteConfirmDialogProps {
  isOpen: boolean;
  entityName: string;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteConfirmDialog(props: DeleteConfirmDialogProps) {
  return (
    <dialog class="modal" classList={{ 'modal-open': props.isOpen }}>
      <div class="modal-box">
        <h3 class="font-bold text-lg">Confirm Delete</h3>

        <div class="py-4">
          <p class="text-base-content/80">
            Are you sure you want to delete <span class="font-semibold">{props.entityName}</span>?
          </p>
          <p class="text-sm text-base-content/60 mt-2">This action cannot be undone.</p>
        </div>

        <div class="modal-action">
          <button class="btn" onClick={props.onClose}>
            Cancel
          </button>
          <button class="btn btn-error" onClick={props.onConfirm}>
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button onClick={props.onClose}>close</button>
      </form>
    </dialog>
  );
}
