import React from 'react';
import Link from 'next/link';
import { Eye, Edit, Trash2, Check, X, LogOut, RotateCcw, ExternalLink } from 'lucide-react';
import { BUTTON_SQUARE_CLASS } from './button';

interface IconButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLDivElement | HTMLAnchorElement>;
  variant?: 'view' | 'edit' | 'delete' | 'check' | 'cancel' | 'logout' | 'restore' | 'external';
  disabled?: boolean;
  className?: string;
  title?: string;
  /** Use div instead of button to avoid nested button issues */
  asDiv?: boolean;
  /** Pass href to render as Next.js Link for native a-tag features like right click -> open in new tab */
  href?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  onClick,
  variant = 'view',
  disabled = false,
  className = '',
  title,
  asDiv = false,
  href,
}) => {
  const variantConfig = {
    view: { icon: Eye, styles: 'text-secondary hover:bg-secondary/15 hover:text-secondary active:bg-secondary/20' },
    edit: { icon: Edit, styles: 'text-primary hover:bg-primary/15 hover:text-primary active:bg-primary/20' },
    delete: { icon: Trash2, styles: 'text-danger hover:bg-danger/15 hover:text-danger active:bg-danger/20' },
    check: { icon: Check, styles: 'text-success hover:bg-success/15 active:bg-success/20' },
    logout: { icon: LogOut, styles: 'text-[#4a5565] hover:bg-[#4a5565]/10 hover:text-[#4a5565] active:bg-[#4a5565]/15' },
    cancel: { icon: X, styles: 'text-danger hover:bg-danger/15 hover:text-danger active:bg-danger/20' },
    restore: { icon: RotateCcw, styles: 'text-success hover:bg-success/15 hover:text-success active:bg-success/20' },
    external: { icon: ExternalLink, styles: 'text-primary2 hover:bg-primary2/15 hover:text-primary2 active:bg-primary2/20' },
  };

  const { icon: Icon, styles } = variantConfig[variant];
  const baseClassName = `z-10 ${BUTTON_SQUARE_CLASS} rounded-r1 inline-flex items-center justify-center transition-all duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${styles} ${className}`;

  if (href && !disabled) {
    return (
      <Link 
        href={href}
        onClick={onClick as React.MouseEventHandler<HTMLAnchorElement>}
        title={title}
        className={baseClassName}
      >
        <Icon className="w-5 h-5" />
      </Link>
    );
  }

  if (asDiv) {
    return (
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={disabled ? undefined : onClick as React.MouseEventHandler<HTMLDivElement>}
        onKeyDown={(e) => {
          if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
          }
        }}
        title={title}
        aria-disabled={disabled}
        className={`${baseClassName} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <Icon className="w-5 h-5" />
      </div>
    );
  }

  return (
    <button
      onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
      disabled={disabled}
      title={title}
      className={baseClassName}
    >
      <Icon className="w-5 h-5" />
    </button>
  );
};
