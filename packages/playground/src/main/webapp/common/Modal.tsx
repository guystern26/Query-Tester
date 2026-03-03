import React from 'react';
import styled from 'styled-components';
// TODO: Replace with @splunk/react-ui

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const Panel = styled.div`
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  max-width: 90vw;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  transition: var(--transition-fast);
`;

const Header = styled.div`
  padding: var(--radius-lg);
  border-bottom: 1px solid var(--border);
  font-weight: 600;
  font-size: 1.125rem;
`;

const Body = styled.div`
  padding: var(--radius-lg);
  overflow: auto;
  flex: 1;
`;

const Footer = styled.div`
  padding: var(--radius-lg);
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: var(--radius-md);
`;

const FooterBtn = styled.button<{ $variant: 'default' | 'danger' }>`
  padding: var(--radius-sm) var(--radius-lg);
  border-radius: var(--radius-md);
  font-size: 1rem;
  cursor: pointer;
  border: 1px solid var(--border);
  background: ${(p) => (p.$variant === 'danger' ? 'var(--error)' : 'var(--bg-hover)')};
  color: ${(p) => (p.$variant === 'danger' ? 'white' : 'var(--text-primary)')};
  &:hover {
    background: ${(p) => (p.$variant === 'danger' ? 'var(--error)' : 'var(--border-light)')};
    filter: ${(p) => (p.$variant === 'danger' ? 'brightness(1.1)' : 'none')};
  }
`;

export type ModalVariant = 'default' | 'danger';

export interface ModalProps {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  confirmLabel?: string;
  onConfirm?: () => void;
  variant?: ModalVariant;
}

export function Modal({
  open,
  title,
  children,
  onClose,
  confirmLabel,
  onConfirm,
  variant = 'default',
}: ModalProps) {
  if (!open) return null;
  return (
    <Overlay onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <Panel onClick={(e) => e.stopPropagation()}>
        <Header id="modal-title">{title}</Header>
        <Body>{children}</Body>
        <Footer>
          <FooterBtn type="button" $variant="default" onClick={onClose}>
            Cancel
          </FooterBtn>
          {confirmLabel != null && onConfirm != null && (
            <FooterBtn type="button" $variant={variant} onClick={onConfirm}>
              {confirmLabel}
            </FooterBtn>
          )}
        </Footer>
      </Panel>
    </Overlay>
  );
}
