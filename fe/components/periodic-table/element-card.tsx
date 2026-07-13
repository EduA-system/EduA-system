"use client";

import React from 'react';
import type { Element } from './types';

interface ElementCardProps {
  element: Element;
  isVisible: boolean;
  isSelected: boolean;
  color: string;
  borderColor: string;
  onClick: (el: Element) => void;
}

function ElementCardInner({ element, isVisible, isSelected, color, borderColor, onClick }: ElementCardProps) {
  return (
    <button
      onClick={() => onClick(element)}
      title={`${element.nameVi} (${element.name})`}
      className={[
        'relative flex h-full w-full flex-col items-center justify-center rounded-lg border origin-center shadow-sm',
        'transition-[background-color,border-color,transform,box-shadow,opacity,filter] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]',
        'hover:scale-[1.12] hover:-translate-y-0.5 hover:shadow-lg hover:z-10 hover:brightness-105 active:scale-[1.06]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400',
        isVisible ? 'cursor-pointer opacity-100 scale-100' : 'opacity-10 scale-[0.92] pointer-events-none',
        isSelected ? 'ring-2 ring-purple-500 ring-offset-2 scale-[1.12] -translate-y-0.5 shadow-lg z-10' : '',
      ].join(' ')}
      style={{ backgroundColor: color, borderColor, boxShadow: '0 2px 4px rgba(15, 23, 42, 0.10), 0 1px 2px rgba(15, 23, 42, 0.06)' }}
    >
      <span className="absolute left-[7%] top-[5%] font-mono leading-none opacity-60" style={{ fontSize: 'clamp(10px, 20%, 17px)' }}>
        {element.atomicNumber}
      </span>
      <span className="font-bold leading-none tracking-tight" style={{ fontSize: 'clamp(18px, 46%, 40px)' }}>
        {element.symbol}
      </span>
      <span className="mt-[7%] max-w-full truncate px-0.5 text-center leading-tight opacity-75" style={{ fontSize: 'clamp(10px, 19%, 15px)' }}>
        {element.nameVi}
      </span>
    </button>
  );
}

export const ElementCard = React.memo(ElementCardInner);
