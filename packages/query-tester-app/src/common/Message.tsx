import React, { useState, useEffect } from 'react';
// TODO: Replace with @splunk/react-ui

type MessageType = 'info' | 'warning' | 'error' | 'success';

const typeStyles: Record<MessageType, string> = {
  info: 'bg-blue-900/20 border-blue-800 text-blue-300',
  warning: 'bg-amber-900/20 border-amber-800 text-amber-300',
  error: 'bg-red-900/20 border-red-800 text-red-300',
  success: 'bg-green-900/20 border-green-800 text-green-300',
};

export interface MessageProps {
  type: MessageType;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  autoHideMs?: number;
}

export function Message({ type, children, dismissible = false, onDismiss, autoHideMs }: MessageProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!visible || autoHideMs == null) return;
    const id = setTimeout(() => setVisible(false), autoHideMs);
    return () => clearTimeout(id);
  }, [visible, autoHideMs]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <div className={`flex items-start gap-2 p-3 border rounded-lg text-xs ${typeStyles[type]}`}>
      <div className="flex-1">{children}</div>
      {dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className="text-slate-400 hover:text-slate-200 text-lg leading-none cursor-pointer"
          aria-label="Dismiss"
        >
          ×
        </button>
      )}
    </div>
  );
}
