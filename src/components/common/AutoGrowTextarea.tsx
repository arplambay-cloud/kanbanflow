import React, { useEffect, useRef, useCallback } from 'react';

type Props = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> & {
  /** Rows to show when empty. */
  minRows?: number;
  /** Stop growing past this height (px); the field scrolls beyond it. */
  maxHeight?: number;
};

/**
 * A textarea that grows to fit its content.
 *
 * The description field was fixed at three rows with `resize-none`, so anything
 * longer was cut mid-sentence behind an inner scrollbar. This sizes itself to
 * the content up to `maxHeight`, after which it scrolls — the modal already
 * scrolls, so an unbounded field would just push the actions off screen.
 *
 * `resize-y` stays enabled so the field can still be dragged taller by hand.
 */
export const AutoGrowTextarea: React.FC<Props> = ({
  minRows = 3,
  maxHeight = 360,
  className = '',
  value,
  onChange,
  ...rest
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // Reset first so the height can shrink as well as grow.
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [maxHeight]);

  // Re-fit whenever the value changes, including when the modal populates it.
  useEffect(resize, [resize, value]);

  // The field is hidden until the modal opens, so scrollHeight is 0 on the
  // first pass; re-measure once layout has settled.
  useEffect(() => {
    const id = requestAnimationFrame(resize);
    return () => cancelAnimationFrame(id);
  }, [resize]);

  return (
    <textarea
      ref={ref}
      rows={minRows}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        resize();
      }}
      className={`resize-y ${className}`}
      {...rest}
    />
  );
};
