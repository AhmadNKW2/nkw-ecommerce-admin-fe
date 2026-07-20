import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Checkbox } from "../ui/checkbox";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { Category } from "../../services/categories/types/category.types";
import { cn } from "../../lib/utils";
import { FieldWrapper, getFieldClasses } from "../ui/field-wrapper";
import { ChevronDown, Search, X } from "lucide-react";

interface CategoryTreeSelectProps {
  id?: string;
  categories: Category[];
  recentCategories?: Category[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  exclusiveOption?: {
    value: string;
    label: string;
  };
  singleSelect?: boolean;
  label?: string;
  error?: string | boolean;
  placeholder?: string;
  disabled?: boolean;
}

interface CategoryTreeNodeProps {
  category: Category;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  level?: number;
  singleSelect?: boolean;
  searchTerm?: string;
  forceShow?: boolean;
  isLast?: boolean;
  exclusiveValues?: string[];
}

const CategoryTreeNode: React.FC<CategoryTreeNodeProps> = ({
  category,
  selectedIds,
  onChange,
  level = 0,
  singleSelect = false,
  searchTerm = "",
  forceShow = false,
  isLast = false,
  exclusiveValues = [],
}) => {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isSelected = selectedIds.includes(category.id.toString());
  const hasChildren = category.children && category.children.length > 0;
  
  const nameMatches = useMemo(() => {
    if (!searchTerm) return false;
    return category.name_en.toLowerCase().includes(searchTerm.toLowerCase());
  }, [category.name_en, searchTerm]);

  const hasMatchingDescendants = useMemo(() => {
    if (!searchTerm) return false;
    const checkChildren = (cats: Category[]): boolean => {
      return cats.some(c => {
        if (c.name_en.toLowerCase().includes(searchTerm.toLowerCase())) return true;
        if (c.children) return checkChildren(c.children);
        return false;
      });
    };
    return category.children ? checkChildren(category.children) : false;
  }, [category.children, searchTerm]);

  const shouldRender = !searchTerm || forceShow || nameMatches || hasMatchingDescendants;

  if (!shouldRender) return null;

  const handleCheck = (checked: boolean) => {
    if (singleSelect) {
      if (checked) {
        onChange([category.id.toString()]);
      } else {
        onChange([]);
      }
    } else {
      let newSelected = [...selectedIds];
      if (checked) {
        newSelected = newSelected.filter((id) => !exclusiveValues.includes(id));
        newSelected.push(category.id.toString());
      } else {
        newSelected = newSelected.filter((id) => id !== category.id.toString());
      }
      onChange(newSelected);
    }
  };

  // Expand if we have matching descendants (to show them) or if we match (to show our children)
  const shouldExpand = searchTerm && (hasMatchingDescendants || nameMatches);
  const defaultValue = shouldExpand ? category.id.toString() : undefined;

  // If this node matches, force show all children
  const shouldForceShowChildren = forceShow || (!!searchTerm && nameMatches);

  if (hasChildren) {
    return (
      <Accordion 
        type="multiple" 
        className="w-full" 
        defaultValue={[category.id.toString()]}
        // Key is important to reset state when search changes
        key={`${category.id}-${searchTerm}`} 
      >
        <AccordionItem value={category.id.toString()} className="border-0">
          <div 
            className={cn("flex items-center hover:bg-gray-50 rounded-md transition-colors cursor-pointer", level > 0 && "ml-2", isLast && "pb-0")}
            onClick={(e) => {
              e.preventDefault();
              triggerRef.current?.click();
            }}
          >
            <div className="flex items-center flex-1 min-w-0">
              <div 
                className="flex items-center justify-center py-2 pl-1 pr-2"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={isSelected}
                  onChange={handleCheck}
                />
              </div>
              <AccordionTrigger 
                ref={triggerRef}
                className="py-2 hover:no-underline flex-1 text-sm font-normal text-gray-700 [&[data-state=open]>svg]:rotate-180"
                onClick={(e) => e.stopPropagation()}
              >
                <span className="truncate text-left flex-1">
                  {category.name_en}
                  {searchTerm && nameMatches && <span className="ml-2 text-xs text-primary font-medium">(Match)</span>}
                </span>
              </AccordionTrigger>
            </div>
          </div>
          <AccordionContent className="pl-4 border-l border-primary/20 ml-3.5 pb-0">
            {category.children?.map((child, index, arr) => (
              <CategoryTreeNode
                key={child.id}
                category={child}
                selectedIds={selectedIds}
                onChange={onChange}
                level={level + 1}
                singleSelect={singleSelect}
                searchTerm={searchTerm}
                forceShow={shouldForceShowChildren}
                isLast={index === arr.length - 1}
              />
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    );
  }

  return (
    <div 
      className={cn("flex items-center hover:bg-gray-50 rounded-md pr-2 transition-colors cursor-pointer", level > 0 && "ml-2", isLast && "pb-0")}
      onClick={(e) => {
        e.preventDefault();
        handleCheck(!isSelected);
      }}
    >
      <div 
        className="flex items-center justify-center py-2 pl-1 pr-2"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onChange={handleCheck}
        />
      </div>
      <span className="text-sm text-gray-700 truncate flex-1 py-2">
        {category.name_en}
        {searchTerm && nameMatches && <span className="ml-2 text-xs text-primary font-medium">(Match)</span>}
      </span>
    </div>
  );
};

const findCategoryInTree = (
  categories: Category[],
  id: string
): Category | undefined => {
  for (const category of categories) {
    if (category.id.toString() === id) return category;
    if (category.children) {
      const found = findCategoryInTree(category.children, id);
      if (found) return found;
    }
  }
  return undefined;
};

export const CategoryTreeSelect: React.FC<CategoryTreeSelectProps> = ({
  id,
  categories,
  recentCategories,
  selectedIds,
  onChange,
  exclusiveOption,
  singleSelect = false,
  label,
  error,
  placeholder = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
    direction: "up" | "down";
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasValue = selectedIds.length > 0;

  const updatePanelPosition = useCallback(() => {
    if (!containerRef.current || typeof window === "undefined") {
      return;
    }

    const rect = containerRef.current.getBoundingClientRect();
    const viewportPadding = 16;
    const dropdownOffset = 8;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openUpward = spaceBelow < 280 && spaceAbove > spaceBelow;
    const availableSpace = openUpward ? spaceAbove : spaceBelow;
    const width = Math.min(rect.width, window.innerWidth - viewportPadding * 2);
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding
    );

    setPanelPosition({
      top: openUpward ? rect.top - dropdownOffset : rect.bottom + dropdownOffset,
      left,
      width,
      maxHeight: Math.max(180, Math.min(360, availableSpace - dropdownOffset)),
      direction: openUpward ? "up" : "down",
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        !panelRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      updatePanelPosition();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setSearchTerm(""); // Reset search when closing
      setPanelPosition(null);
    }
  }, [isOpen, updatePanelPosition]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    updatePanelPosition();

    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [isOpen, updatePanelPosition]);

  const selectedItems = useMemo(() => {
    return selectedIds
      .map((id) => {
        if (exclusiveOption && id === exclusiveOption.value) {
          return {
            id,
            label: exclusiveOption.label,
          };
        }

        const category = findCategoryInTree(categories, id);
        if (!category) {
          return null;
        }

        return {
          id,
          label: category.name_en,
        };
      })
      .filter((item): item is { id: string; label: string } => !!item);
  }, [categories, exclusiveOption, selectedIds]);

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onChange(selectedIds.filter((selectedId) => selectedId !== id));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  const dropdownPanel =
    isOpen && panelPosition && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            style={{
              top: panelPosition.top,
              left: panelPosition.left,
              width: panelPosition.width,
              transform: panelPosition.direction === "up" ? "translateY(-100%)" : undefined,
            }}
            className="fixed z-70 border border-primary/20 rounded-lg bg-white shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top"
          >
            <div className="p-2 border-b border-primary/20 bg-gray-50/50">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 bg-white border-primary/20"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>

            <div
              className="overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
              style={{ maxHeight: panelPosition.maxHeight }}
            >
              {categories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No categories found
                </div>
              ) : (
                <>
                  {exclusiveOption && (!searchTerm || exclusiveOption.label.toLowerCase().includes(searchTerm.toLowerCase())) && (
                    <div className="mb-2">
                      <div
                        className="flex items-center hover:bg-gray-50 rounded-md pr-2 transition-colors cursor-pointer"
                        onClick={(event) => {
                          event.preventDefault();
                          onChange(
                            selectedIds.includes(exclusiveOption.value)
                              ? []
                              : [exclusiveOption.value]
                          );
                        }}
                      >
                        <div
                          className="flex items-center justify-center py-2 pl-1 pr-2"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Checkbox
                            checked={selectedIds.includes(exclusiveOption.value)}
                            onChange={(checked) => {
                              onChange(checked ? [exclusiveOption.value] : []);
                            }}
                          />
                        </div>
                        <span className="text-sm text-gray-700 truncate flex-1 py-2 font-medium">
                          {exclusiveOption.label}
                        </span>
                      </div>
                    </div>
                  )}
                  {!searchTerm && recentCategories && recentCategories.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs font-semibold text-muted-foreground mb-2 px-1 uppercase tracking-wider">
                        Recently Used
                      </div>
                      {recentCategories.map((recentCategory) => (
                        <CategoryTreeNode
                          key={`recent-${recentCategory.id}`}
                          category={{ ...recentCategory, children: undefined }}
                          selectedIds={selectedIds}
                          onChange={onChange}
                          singleSelect={singleSelect}
                          searchTerm={searchTerm}
                          exclusiveValues={exclusiveOption ? [exclusiveOption.value] : []}
                        />
                      ))}
                    </div>
                  )}
                  <div>
                    {!searchTerm && recentCategories && recentCategories.length > 0 && (
                      <div className="text-xs font-semibold text-muted-foreground mb-2 px-1 uppercase tracking-wider">
                        All Categories
                      </div>
                    )}
                    {categories.map((category) => (
                      <CategoryTreeNode
                        key={category.id}
                        category={category}
                        selectedIds={selectedIds}
                        onChange={onChange}
                        singleSelect={singleSelect}
                        searchTerm={searchTerm}
                        exclusiveValues={exclusiveOption ? [exclusiveOption.value] : []}
                      />
                    ))}
                  </div>
                </>
              )}
              {searchTerm && categories.every(c => {
                 // Simple check if everything is filtered out at top level
                 // This is not perfect as CategoryTreeNode does the filtering, but good enough for empty state hint
                 return false; 
              }) && (
                 <div className="text-center py-4 text-muted-foreground text-sm">
                   No matches found
                 </div>
              )}
            </div>

            {!singleSelect && (
              <div className="p-2 border-t border-primary/20 bg-gray-50/50 flex justify-between items-center text-xs text-muted-foreground px-3">
                <span>{selectedIds.length} selected</span>
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div id={id} ref={containerRef} className="relative group w-full">
      <FieldWrapper
        label={label}
        error={error}
        isFocused={isFocused || isOpen}
        hasValue={hasValue}
      >
        <div
          className={cn(
              getFieldClasses(error, hasValue),
              "h-13 cursor-pointer flex items-center justify-between min-h-10.5 py-1 px-3 bg-white transition-all duration-200",
              isOpen && " border-secondary shadow-s2",
              disabled && "opacity-50 cursor-not-allowed bg-gray-50"
            )}
            onClick={() => {
              if (disabled) return;
              setIsOpen(!isOpen);
              setIsFocused(!isOpen);
            }}
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === 'Enter' || e.key === ' ') {
                setIsOpen(!isOpen);
                setIsFocused(!isOpen);
              }
            }}
        >
          <div className="flex flex-wrap gap-1.5 flex-1 overflow-hidden">
            {selectedItems.length > 0 ? (
              selectedItems.map((item) => (
                <Badge 
                  key={item.id} 
                  variant="default" 
                  className="pl-2 pr-1 py-0.5 h-6 text-xs font-medium flex items-center gap-1 hover:bg-secondary/20 transition-colors"
                >
                  <span className="truncate max-w-37.5">{item.label}</span>
                  <div 
                    role="button"
                    className="rounded-full p-0.5 hover:bg-secondary/30 cursor-pointer"
                    onClick={(e) => handleRemove(e, item.id)}
                  >
                    <X className="h-3 w-3" />
                  </div>
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground text-sm">{placeholder}</span>
            )}
          </div>
          
          <div className="flex items-center gap-2 pl-2">
            {selectedIds.length > 0 && (
              <div 
                role="button"
                onClick={handleClearAll}
                className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-full hover:bg-gray-100"
                title="Clear all"
              >
                <X className="h-4 w-4" />
              </div>
            )}
            <ChevronDown className={cn("h-4 w-4 text-primary/60 transition-transform duration-300", isOpen && "rotate-180")} />
          </div>
        </div>

      </FieldWrapper>
      {dropdownPanel}
    </div>
  );
};



