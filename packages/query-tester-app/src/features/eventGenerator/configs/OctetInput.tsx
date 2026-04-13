import React, { useRef, useCallback } from 'react';

export interface OctetInputProps {
  /** Array of octet values — 4 for IPv4, 6 for IPv6. Empty string = randomized. */
  octets: (number | '')[];
  onChange: (octets: (number | '')[]) => void;
  /** Which octets are locked (non-editable, shown as static text). */
  locked?: boolean[];
  /** '.' for IPv4, ':' for IPv6 */
  separator: '.' | ':';
}

const octetInputCls =
  'w-10 text-center bg-navy-950 border border-slate-700 rounded text-xs text-slate-300 py-1 px-0.5 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300/20 transition';

const lockedCls =
  'w-10 text-center text-xs text-slate-500 py-1 px-0.5 bg-navy-900 border border-slate-800 rounded select-none';

export function OctetInput({ octets, onChange, locked = [], separator }: OctetInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const setRef = useCallback((i: number) => (el: HTMLInputElement | null) => {
    refs.current[i] = el;
  }, []);

  const focusNext = (i: number) => {
    const next = refs.current[i + 1];
    if (next) next.focus();
  };

  const focusPrev = (i: number) => {
    const prev = refs.current[i - 1];
    if (prev) prev.focus();
  };

  const handleChange = (i: number, raw: string) => {
    // Strip non-digits
    const digits = raw.replace(/\D/g, '');
    if (digits === '') {
      const next = [...octets];
      next[i] = '';
      onChange(next);
      return;
    }
    const num = Math.min(Number(digits), 255);
    const next = [...octets];
    next[i] = num;
    onChange(next);

    // Auto-advance on 3 digits typed
    if (digits.length >= 3) {
      focusNext(i);
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Separator key → advance
    if (e.key === separator || e.key === '.' || e.key === ':') {
      e.preventDefault();
      focusNext(i);
      return;
    }
    // Tab is handled natively
    if (e.key === 'Tab') return;
    // Backspace on empty → go back
    if (e.key === 'Backspace' && octets[i] === '') {
      e.preventDefault();
      focusPrev(i);
    }
  };

  return (
    <div className="flex items-center gap-0">
      {octets.map((val, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span className="text-xs text-slate-600 mx-0.5 select-none">{separator}</span>
          )}
          {locked[i] ? (
            <span className={lockedCls}>{val}</span>
          ) : (
            <input
              ref={setRef(i)}
              className={octetInputCls}
              value={val === '' ? '' : String(val)}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              placeholder="*"
              maxLength={3}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
