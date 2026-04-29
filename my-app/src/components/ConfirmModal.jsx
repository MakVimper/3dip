import './ConfirmModal.css';

const ConfirmModal = ({ isOpen, title, message, confirmText = 'Подтвердить', cancelText = 'Отмена', onConfirm, onCancel, danger = false, success = false }) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-card" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-card__icon">
          {danger ? '⚠️' : success ? '✅' : '❓'}
        </div>
        {title && <h3 className="confirm-card__title">{title}</h3>}
        {message && <p className="confirm-card__message">{message}</p>}
        <div className="confirm-card__actions">
          <button type="button" className="confirm-btn confirm-btn--cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`confirm-btn ${danger ? 'confirm-btn--danger' : success ? 'confirm-btn--success' : 'confirm-btn--confirm'}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
