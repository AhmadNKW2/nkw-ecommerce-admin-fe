import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { FieldWrapper, getFieldClassesBySize, FIELD_ICON_CLASSES, FIELD_RIGHT_ICON_COLOR, getRightIconPosition } from './field-wrapper';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: React.ReactNode;
  error?: string | boolean;
  variant?: 'default' | 'search';
  onClear?: () => void;
  isClearButton?: boolean;
  isNum?: boolean;
  size?: 'default' | 'sm';
  isRtl?: boolean;
  isSearch?: boolean;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', value, onChange, onFocus, onBlur, variant = 'default', onClear, isClearButton = true, isNum = false, size = 'default', isRtl = false, isSearch = false, rightElement, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = Boolean(value && String(value).length > 0);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const handleClear = () => {
      if (onClear) {
        onClear();
      } else if (onChange) {
        onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
      }
    };

    const isSearchVariant = variant === 'search' || isSearch;
    const isSm = size === 'sm';

    const handleNumChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Always pass through the value - validation is handled separately
      onChange?.(e);
    };

    const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
      if (props.type === 'number') {
        (e.target as HTMLInputElement).blur();
      }
    };

    const typeNumberClasses = props.type === 'number' ? '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]' : '';

    const inputClasses = getFieldClassesBySize(size, error, hasValue, isSearchVariant, isNum, className, isRtl);
    const rightIconPosition = getRightIconPosition(size);
    // For RTL, position the # icon on the left side
    const numIconPosition = isRtl ? 'left-4' : rightIconPosition;

    // For sm size without label, render simplified version
    if (isSm && !label) {
      return (
        <div className="w-full">
          <div className="relative">
            {isSearchVariant && (
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                <Search className={FIELD_ICON_CLASSES} />
              </div>
            )}
            <input
              ref={ref}
              value={value}
              onChange={handleNumChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
              onWheel={props.onWheel || handleWheel}
              placeholder={props.placeholder || " "}
              className={`${inputClasses} disabled:opacity-50 peer ${typeNumberClasses}`}
              dir={isRtl ? 'rtl' : 'ltr'}
              {...props}
            />
            {isNum && (
              <span className={`absolute ${numIconPosition} top-1/2 -translate-y-1/2 ${FIELD_RIGHT_ICON_COLOR} text-base pointer-events-none z-10`}>
                #
              </span>
            )}
          </div>
          {error && typeof error === 'string' && error.trim() !== "" && <span className="text-xs text-danger mt-1 block">{error}</span>}
        </div>
      );
    }

    // Standard version with FieldWrapper
    return (
      <FieldWrapper
        label={label}
        error={error}
        isFocused={isFocused}
        hasValue={hasValue}
        onClear={handleClear}
        leftIcon={isSearchVariant ? <Search className={FIELD_ICON_CLASSES} /> : undefined}
        rightIcon={isNum ? <span className={`h-4 w-4 ${FIELD_RIGHT_ICON_COLOR} inline-flex items-center justify-center`}>#</span> : undefined}
        rightElement={rightElement}
        labelLeftOffset={isSearchVariant ? 'left-9' : 'left-4'}
        isClearButton={isClearButton}
        isRtl={isRtl}
        disabled={props.disabled}
      >
        <input
          ref={ref}
          value={value}
          onChange={handleNumChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onWheel={props.onWheel || handleWheel}
          placeholder=""
          className={`${inputClasses} peer ${typeNumberClasses}`}
          dir={isRtl ? 'rtl' : 'ltr'}
          {...props}
        />
      </FieldWrapper>
    );
  }
);

Input.displayName = 'Input';
