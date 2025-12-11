'use client';

import { useEffect, useRef } from 'react';

interface TableScrollContainerProps {
  children: React.ReactNode;
  className?: string;
}

export default function TableScrollContainer({ children, className = '' }: TableScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startX = 0;
    let startY = 0;
    let scrollDirection: 'horizontal' | 'vertical' | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      scrollDirection = null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!container || e.touches.length === 0) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      // Determinar la dirección del scroll si aún no se ha determinado
      if (scrollDirection === null && (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5)) {
        scrollDirection = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
      }

      // Si estamos haciendo scroll horizontal, prevenir que se propague al body
      if (scrollDirection === 'horizontal') {
        const scrollLeft = container.scrollLeft;
        const scrollWidth = container.scrollWidth;
        const clientWidth = container.clientWidth;
        const canScrollLeft = scrollLeft > 0;
        const canScrollRight = scrollLeft < scrollWidth - clientWidth - 1;

        // Si podemos hacer scroll en la dirección del movimiento, prevenir el scroll del body
        if ((deltaX < 0 && canScrollLeft) || (deltaX > 0 && canScrollRight)) {
          e.stopPropagation();
          // Si estamos en los bordes, prevenir el comportamiento por defecto para evitar scroll del body
          if ((scrollLeft === 0 && deltaX > 0) || (scrollLeft + clientWidth >= scrollWidth - 1 && deltaX < 0)) {
            // Ya estamos en el borde, no hacer nada
          } else {
            // Permitir el scroll normal del contenedor
          }
        } else {
          // Estamos en el borde y no podemos hacer más scroll, prevenir el scroll del body
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    const handleTouchEnd = () => {
      scrollDirection = null;
    };

    // Usar capture phase para interceptar eventos antes de que lleguen al body
    container.addEventListener('touchstart', handleTouchStart, { passive: true, capture: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true, capture: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart, { capture: true } as any);
      container.removeEventListener('touchmove', handleTouchMove, { capture: true } as any);
      container.removeEventListener('touchend', handleTouchEnd, { capture: true } as any);
    };
  }, []);

  return (
    <div ref={containerRef} className={`scroll-horizontal ${className}`}>
      {children}
    </div>
  );
}

