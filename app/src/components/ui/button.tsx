import React from 'react';
import Link from 'next/link';

interface ButtonProps {
  children: React.ReactNode;
  // Accept native mouse event so consumers can access the event (e.g. stopPropagation)
  onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;
  variant?: 'outline' | 'solid';
  color?: string;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  isSquare?: boolean;
  href?: string;
}

/** Shared control size: 52px height; square controls are 52×52. */
export const BUTTON_HEIGHT_CLASS = 'h-13';
export const BUTTON_MIN_WIDTH_CLASS = 'min-w-13';
export const BUTTON_SQUARE_CLASS = 'h-13 w-13 min-w-13 p-0';

export const Button: React.FC<ButtonProps> = ({ children, onClick, variant = 'solid', color, disabled = false, className = '', type = 'button', isSquare = false, href }) => {

  const defaultVariantClasses = {
    solid: 'bg-secondary active:bg-secondary/75 hover:bg-secondary/80 text-white',
    outline: 'border border-primary2 text-primary2 hover:bg-primary2 hover:text-white active:bg-primary2 active:text-white',
  };

  const customVariantClasses = {
    solid: 'bg-[var(--button-color)] text-white hover:bg-[var(--button-color)] hover:opacity-80 active:bg-[var(--button-color)] active:opacity-70',
    outline: 'border border-[var(--button-color)] text-[var(--button-color)] hover:bg-[var(--button-color)] hover:text-white',
  };

  const variantClasses = color ? customVariantClasses : defaultVariantClasses;

  const buttonStyle: React.CSSProperties = color ? { '--button-color': color } as React.CSSProperties : {};

  const sizeClasses = isSquare
    ? `${BUTTON_SQUARE_CLASS} flex items-center justify-center`
    : `${BUTTON_HEIGHT_CLASS} ${BUTTON_MIN_WIDTH_CLASS} px-5`;

  const baseClasses = `inline-flex items-center justify-center text-nowrap ${sizeClasses} rounded-r1 font-medium text-[16px] transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`;

  if (href && !disabled) {
    return (
      <Link 
        href={href}
        className={baseClasses}
        style={buttonStyle}
        onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
      disabled={disabled}
      className={baseClasses}
      style={buttonStyle}
    >
      {children}
    </button>
  );
};
