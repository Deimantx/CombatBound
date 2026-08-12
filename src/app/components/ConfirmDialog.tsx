interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  onCancel: () => void
  onConfirm: () => void
}

export function ConfirmDialog({ open, title, message, onCancel, onConfirm }: ConfirmDialogProps) {
  if (!open) return null
  return <div className="dialog-backdrop" role="presentation"><div className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">{title}</h2><p>{message}</p><div className="dialog-actions"><button className="button button-ghost" onClick={onCancel}>Cancel</button><button className="button button-danger" onClick={onConfirm}>Reset state</button></div></div></div>
}
