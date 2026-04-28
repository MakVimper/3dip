import { useEffect, useState } from 'react';
import './Toast.css';

let _showToast = null;

export const showToast = (message, type = 'success') => {
  if (_showToast) _showToast(message, type);
};

const Toast = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    _showToast = (message, type = 'success') => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 2000);
    };
    return () => { _showToast = null; };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast--${t.type}`}>
          {t.type === 'success' && <span className="toast__icon">✓</span>}
          {t.type === 'error' && <span className="toast__icon">✕</span>}
          <span className="toast__msg">{t.message}</span>
        </div>
      ))}
    </div>
  );
};

export default Toast;
