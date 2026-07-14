import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { FieldWrapper, getFieldClassesBySize, FIELD_ICON_CLASSES, FIELD_RIGHT_ICON_COLOR, getRightIconPosition } from './field-wrapper';
import { Input } from './input';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
  group?: string;
  image?: string | null;
}

interface SelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  label?: React.ReactNode;
  error?: string | boolean;
  value?: string | string[];
  onChange?: (value: string | string[]) => void;
  onClear?: () => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  search?: boolean;
  onSearchChange?: (query: string) => void;
  multiple?: boolean;
  size?: 'default' | 'sm';
  name?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export const Select = React.forwardRef<HTMLDivElement, SelectProps>(
  ({ label, error, className = '', value, onChange, onClear, options, placeholder, disabled = false, search = true, onSearchChange, multiple = false, size = 'default', onOpenChange, ...props }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedValues = multiple
      ? (Array.isArray(value) ? value : [])
      : (value ? [value as string] : []);

    const hasValue = selectedValues.length > 0;
    const isSm = size === 'sm';

    const getDisplayValue = () => {
      if (!hasValue) return '';

      if (multiple) {
        const selectedLabels = selectedValues
          .map(val => options.find(opt => opt.value === val)?.label)
          .filter(Boolean);
        return selectedLabels.join(', ');
      }

      return options.find(opt => opt.value === selectedValues[0])?.label || '';
    };

    const displayValue = getDisplayValue();

    // Filter options based on search query
    // If onSearchChange is provided, we assume external filtering
    const filteredOptions = search && searchQuery && !onSearchChange
      ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
      )
      : options;

    useEffect(() => {
      if (onSearchChange) {
        onSearchChange(searchQuery);
      }
    }, [searchQuery, onSearchChange]);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setIsFocused(false);
          setSearchQuery('');
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [isOpen]);

    // Auto-focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && search) {
        // Small delay to ensure dropdown transition completes and element is visible
        const timer = setTimeout(() => {
          searchInputRef.current?.focus();
        }, 50);
        return () => clearTimeout(timer);
      }
    }, [isOpen, search]);

    const prevIsOpen = useRef(isOpen);
    useEffect(() => {
      if (prevIsOpen.current !== isOpen) {
        if (onOpenChange) onOpenChange(isOpen);
        prevIsOpen.current = isOpen;
      }
    }, [isOpen, onOpenChange]);

    const [menuWidth, setMenuWidth]= useState<string | number>('100%');

    useEffect(() => {
      if (isOpen && containerRef.current && !isSm) {
        setMenuWidth(containerRef.current.getBoundingClientRect().width);
      } else if (isSm) {
        setMenuWidth('max-content');
      }
    }, [isOpen, isSm]);

    const handleToggle = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
        setIsFocused(!isOpen);
        if (isOpen) {
          setSearchQuery('');
        }
      }
    };

    const handleSelect = (optionValue: string) => {
      if (multiple) {
        const newValues = selectedValues.includes(optionValue)
          ? selectedValues.filter(v => v !== optionValue)
          : [...selectedValues, optionValue];
        onChange?.(newValues);
      } else {
        onChange?.(optionValue);
        setIsOpen(false);
        setIsFocused(false);
        setSearchQuery('');
      }
    };

    const handleClear = () => {
      if (onClear) {
        onClear();
      } else {
        onChange?.(multiple ? [] : '');
      }
      setSearchQuery('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setIsFocused(true);
        } else {
          // If already open and not searching, toggle close
          setIsOpen(false);
          setIsFocused(false);
        }
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setIsFocused(false);
      } else if (e.key === 'ArrowDown' && isOpen && !search) {
        e.preventDefault();
        // Focus first option
        const firstOption = containerRef.current?.querySelector('[role="option"]:not([aria-disabled="true"])') as HTMLElement;
        firstOption?.focus();
      }
    };

    const handleOptionKeyDown = (e: React.KeyboardEvent, optionValue: string, index: number) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect(optionValue);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextOption = containerRef.current?.querySelectorAll('[role="option"]:not([aria-disabled="true"])')[index + 1] as HTMLElement;
        if (nextOption) {
          nextOption.focus();
        } else if (search) {
          searchInputRef.current?.focus();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (index === 0) {
          if (search) {
            searchInputRef.current?.focus();
          } else {
            (containerRef.current?.querySelector('[role="combobox"]') as HTMLElement)?.focus();
          }
        } else {
          const prevOption = containerRef.current?.querySelectorAll('[role="option"]:not([aria-disabled="true"])')[index - 1] as HTMLElement;
          prevOption?.focus();
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setIsFocused(false);
        (containerRef.current?.querySelector('[role="combobox"]') as HTMLElement)?.focus();
      }
    };

    const handleSearchKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const firstOption = containerRef.current?.querySelector('[role="option"]:not([aria-disabled="true"])') as HTMLElement;
        firstOption?.focus();
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setIsFocused(false);
        (containerRef.current?.querySelector('[role="combobox"]') as HTMLElement)?.focus();
      }
    };

    const selectClasses = getFieldClassesBySize(
      size,
      error,
      hasValue,
      false,
      !isSm,
      className
    );
    const rightIconPosition = getRightIconPosition(size);
    const chevronIcon = <ChevronDown className={`h-4 w-4 ${FIELD_RIGHT_ICON_COLOR} transition-transform duaration-300 ${isOpen ? 'rotate-180' : ''}`} />;

    return (
      <div ref={containerRef} className={`relative ${isSm ? 'w-fit' : 'w-full'}`}>
        {isSm ? (
          <>
            <div
              ref={ref}
              role="combobox"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-controls="select-dropdown"
              aria-disabled={disabled}
              // --- FIX 1: Add Event Handlers to Small Variant ---
              onClick={handleToggle}
              onKeyDown={handleKeyDown}
              tabIndex={disabled ? -1 : 0}
              // ------------------------------------------------
              className={`${selectClasses} ${disabled ? 'opacity-50' : 'cursor-pointer'} flex items-center justify-start text-center`}
              {...props}
            >
              <span className={hasValue ? '' : 'text-transparent'}>
                {displayValue || ''}
              </span>
            </div>
            {/* Icon */}
            <div className={`absolute ${rightIconPosition} top-1/2 -translate-y-1/2 pointer-events-none z-10`}>
              {chevronIcon}
            </div>
          </>
        ) : (
          <FieldWrapper
            label={label}
            error={error}
            isFocused={isFocused}
            hasValue={hasValue}
            onClear={handleClear}
            rightIcon={chevronIcon}
            isClearButton={true}
            disabled={disabled}
          >
            <div
              ref={ref}
              role="combobox"
              aria-expanded={isOpen}
              aria-haspopup="listbox"
              aria-controls="select-dropdown"
              aria-disabled={disabled}
              tabIndex={disabled ? -1 : 0}
              onClick={handleToggle}
              onKeyDown={handleKeyDown}
              className={`${selectClasses} ${disabled ? '' : 'cursor-pointer'} ${multiple && hasValue ? '' : ''}`}
              {...props}
            >
              {multiple && hasValue ? (
                <div className="flex flex-wrap gap-1.5">
                  {selectedValues.map((val) => {
                    const option = options.find(opt => opt.value === val);
                    return (
                      <div
                        key={val}
                        className="inline-flex items-center bg-primary/5 border border-primary/20 text-primary rounded-full px-2.5 py-1 text-sm font-medium"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <span>{option?.label || val}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(val);
                          }}
                          className="ml-1.5 text-primary hover:text-primary/80 font-bold"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className={hasValue ? '' : 'text-transparent'}>
                  {displayValue || ''}
                </span>
              )}
            </div>
          </FieldWrapper>
        )}

        {/* Dropdown Menu */}
        <div
          id="select-dropdown"
          role="listbox"
          aria-multiselectable={multiple}
          // --- FIX 2: Change fixed to absolute to anchor to parent ---
          className={`absolute z-50 mt-1 bg-white border border-primary/20 overflow-hidden rounded-r1 shadow-s1 transition-all duaration-300 origin-top ${isOpen
            ? 'opacity-100 scale-y-100 visible'
            : 'opacity-0 scale-y-95 invisible'
            }`}
          style={{
            // Ensure it has at least 100% width of parent, but can be auto for small inputs
            minWidth: '100%',
            width: menuWidth,
            // Allow longer labels (e.g. vendor names) without clipping
            maxWidth: isSm ? '300px' : 'min(100vw - 2rem, 28rem)',
          }}
        >
          {/* Search Input */}
          {search && (
            <div className="p-2 border-b border-primary/20">
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${FIELD_ICON_CLASSES} pointer-events-none`} />
                <Input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Search..."
                  isSearch
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}

          <div className="overflow-y-auto max-h-60">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3  text-sm">
                {search && searchQuery ? 'No results found' : 'No options available'}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = selectedValues.includes(option.value);
                const prevGroup = index > 0 ? filteredOptions[index - 1].group : undefined;
                const showGroupHeader = option.group && option.group !== prevGroup;
                return (
                  <React.Fragment key={`${option.value}__${index}`}>
                    {showGroupHeader && (
                      <div className="px-4 py-1.5 text-xs font-semibold text-primary/50 uppercase tracking-wider border-t border-primary/10 first:border-t-0">
                        {option.group}
                      </div>
                    )}
                  <div
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    tabIndex={option.disabled ? -1 : 0}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    onKeyDown={(e) => !option.disabled && handleOptionKeyDown(e, option.value, index)}
                    className={`cursor-pointer transition-colors flex items-center gap-2 px-4 py-3 ${option.disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-primary/20 focus:bg-primary/20 focus:outline-none'
                      } ${isSelected ? 'bg-primary/20 text-primary font-medium' : ''}`}
                  >
                    {multiple && (
                      <div className={`w-4 h-4 border rounded flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary' : 'border-primary/20'
                        }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}
                    {option.image !== undefined && (
                      <div className="w-8 h-8 shrink-0 rounded overflow-hidden border border-primary/10 bg-gray-50 flex items-center justify-center">
                        {option.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={option.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-gray-300">N/A</span>
                        )}
                      </div>
                    )}
                    <span>{option.label}</span>
                  </div>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';