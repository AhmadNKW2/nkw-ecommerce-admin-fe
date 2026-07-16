import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'nested';
  noFlex?: boolean;
  id?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  variant = 'default',
  noFlex = false,
  id,
  ...props
}) => {
  const baseStyles = noFlex ? 'w-full' : 'flex flex-col gap-5 w-full';
  const variantStyles = variant === 'nested'
    ? 'bg-primary/5 p-4 rounded-r1 border border-primary/20'
    : 'p-3 sm:p-4 md:p-5 rounded-r1 bg-white shadow-s1 relative';

  return (
    <div id={id} className={`${baseStyles} ${variantStyles} ${className}`} {...props}>
      {children}
    </div>
  );
};