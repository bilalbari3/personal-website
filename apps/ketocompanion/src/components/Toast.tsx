import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Toast } from './ui';

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>();
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <Toast message={msg} />
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
