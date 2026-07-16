import React, { useState } from 'react';
import { FieldWrapper, getFieldClasses } from './field-wrapper';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string | boolean;
  onClear?: () => void;
  autoResize?: boolean;
  minRows?: number;
  maxRows?: number;
  isRtl?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      className = '',
      value,
      onChange,
      onFocus,
      onBlur,
      onClear,
      isRtl = false,
      autoResize: _autoResize,
      minRows,
      maxRows: _maxRows,
      rows,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = Boolean(value && String(value).length > 0);

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const handleClear = () => {
      if (onClear) {
        onClear();
      } else if (onChange) {
        onChange({ target: { value: '' } } as React.ChangeEvent<HTMLTextAreaElement>);
      }
    };

    return (
      <FieldWrapper
        label={label}
        error={error}
        isFocused={isFocused}
        hasValue={hasValue}
        onClear={handleClear}
        isRtl={isRtl}
      >
        <textarea
          ref={ref}
          value={value}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={" "}
          rows={rows ?? minRows}
          className={`${getFieldClasses(error, hasValue, false, false, className, isRtl)} resize-y min-h-20`}
          dir={isRtl ? 'rtl' : 'ltr'}
          {...props}
        />
      </FieldWrapper>
    );
  }
);

Textarea.displayName = 'Textarea';
