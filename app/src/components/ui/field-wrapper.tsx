import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface FieldWrapperProps {
    label?: ReactNode;
    error?: string | boolean;
    isFocused: boolean;
    hasValue: boolean;
    onClear?: () => void;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    rightElement?: ReactNode;
    isClearButton?: boolean;
    children: ReactNode;
    className?: string;
    labelLeftOffset?: string;
    disabled?: boolean;
    isRtl?: boolean;
}

export const FieldWrapper: React.FC<FieldWrapperProps> = ({
    label,
    error,
    isFocused,
    hasValue,
    onClear,
    leftIcon,
    rightIcon,
    rightElement,
    isClearButton = true,
    children,
    className = '',
    labelLeftOffset,
    disabled = false,
    isRtl = false,
}) => {
    const showLabel = isFocused || hasValue;
    const showClear = isClearButton && hasValue && onClear;
    const resolvedLabelOffset =
        labelLeftOffset ?? (isRtl ? 'right-4' : 'left-4');

    return (
        <div className="w-full" dir={isRtl ? 'rtl' : undefined}>
            <div className={`relative w-full ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {leftIcon && (
                    <div className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 pointer-events-none z-10`}>
                        {leftIcon}
                    </div>
                )}

                {children}

                {/* Right icon - positioned on left for RTL, right for LTR */}
                {rightIcon && (
                    <div className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 pointer-events-none z-10`}>
                        {rightIcon}
                    </div>
                )}

                {/* Right element (clickable) - positioned on right for LTR, left for RTL */}
                {rightElement && (
                    <div className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 z-10`}>
                        {rightElement}
                    </div>
                )}

                {/* Clear button positioned on left for RTL, right for LTR */}
                {showClear && (
                    <button
                        type="button"
                        onClick={onClear}
                        className={`absolute ${isRtl ? (rightIcon ? 'left-9' : leftIcon ? 'left-9' : 'left-3') : (rightElement ? 'right-10' : rightIcon ? 'right-9' : 'right-3')} top-1/2 -translate-y-1/2  hover: transition-colors z-10`}
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}

                {label && (
                    <label
                        className={`absolute ${resolvedLabelOffset} rounded-r1 p-1 bg-white font-medium transition-all duaration-300 pointer-events-none z-10 ${showLabel
                            ? 'top-0 -translate-y-1/2  text-xs'
                            : 'top-1/2 -translate-y-1/2 text-primary2 text-sm'
                            } ${error && showLabel ? 'text-danger' : ''}`}
                    >
                        {label}
                    </label>
                )}
            </div>
            {error && typeof error === 'string' && error.trim() !== "" && (
                <span className={`text-xs text-danger mt-1 block ${isRtl ? 'text-right' : 'text-left'}`}>
                    {error}
                </span>
            )}
        </div>

    );
};

// Shared field styles constant
export const FIELD_BASE_CLASSES = 'min-h-13 border rounded-r1 placeholder-primary/60 bg-white focus:outline-none focus:border-secondary focus:shadow-s2 transition-all duaration-300 disabled:cursor-not-allowed aria-disabled:cursor-not-allowed';

// Shared icon styles for consistent appearance across all field components
export const FIELD_ICON_CLASSES = 'h-4 w-4 text-primary/60';

// Shared right icon color for consistency across all inputs
export const FIELD_RIGHT_ICON_COLOR = 'text-primary/60';

// Get right icon position based on size
export const getRightIconPosition = (size: 'default' | 'sm') => {
    return size === 'sm' ? 'right-4' : 'right-4';
};

// Get field classes based on size variant
export const getFieldClassesBySize = (
    size: 'default' | 'sm',
    error?: string | boolean,
    hasValue?: boolean,
    isSearchVariant?: boolean,
    isNum?: boolean,
    className?: string,
    isRtl?: boolean
) => {
    const hasLeftIcon = isSearchVariant;
    const hasRightIcon = isNum;
    const borderColor = error ? 'border-danger!' : 'border-primary/20';

    if (size === 'sm') {
        const rightPadding = hasRightIcon ? 'pr-7' : 'pr-2';
        const leftPadding = hasLeftIcon ? 'pl-7' : 'pl-2';
        return `${className || ''} ${FIELD_BASE_CLASSES} w-20 py-2.5 px-1 ${leftPadding} ${rightPadding} text-base ${borderColor}`;
    }

    // Default size
    let leftPadding: string;
    let rightPadding: string;

    if (isRtl) {
        // Clear / trailing controls sit on the physical left in RTL.
        leftPadding = hasRightIcon || isNum ? 'pl-13' : 'pl-8';
        rightPadding = hasLeftIcon ? 'pr-9' : 'pr-4';
    } else if (isNum) {
        leftPadding = 'pl-4';
        rightPadding = 'pr-13';
    } else {
        leftPadding = hasLeftIcon ? 'pl-9' : 'pl-4';
        rightPadding = hasRightIcon ? 'pr-13' : 'pr-8';
    }

    return `${className || ''} ${FIELD_BASE_CLASSES} w-full py-3 ${leftPadding} ${rightPadding} ${borderColor} ${isRtl ? 'text-right' : 'text-left'}`;
};

// Legacy function for backward compatibility
export const getFieldClasses = (error?: string | boolean, hasValue?: boolean, hasLeftIcon?: boolean, hasRightIcon?: boolean, className?: string, isRtl?: boolean) => {
    return getFieldClassesBySize('default', error, hasValue, hasLeftIcon, hasRightIcon, className, isRtl);
};
