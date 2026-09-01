import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

/**
 * Renders a modal into <body> instead of wherever it happens to sit in the tree.
 *
 * Every modal in this app is a `fixed inset-0` overlay rendered deep inside
 * <main>. `position: fixed` is only relative to the viewport while no ancestor
 * establishes a containing block — any ancestor gaining `transform`, `filter`,
 * `backdrop-filter`, `perspective`, `contain` or `will-change` silently
 * re-anchors it, so the overlay stops covering the header and sidebar. It also
 * leaves the overlay subject to ancestor stacking contexts.
 *
 * Portalling to <body> removes both dependencies: the overlay always covers the
 * full viewport and always stacks above the app chrome, whatever the layout
 * above it does later.
 *
 * Also locks background scroll while open, so the page behind cannot be moved
 * with the wheel.
 */
export const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  useEffect(() => {
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);

  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
};
