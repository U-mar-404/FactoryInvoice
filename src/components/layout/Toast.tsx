import React from 'react';
import { useApp } from '../../context/AppContext';

export const ToastContainer: React.FC = () => {
  const { toasts } = useApp();

  return (
    <div className="toastWrap">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.kind || ''}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
};
