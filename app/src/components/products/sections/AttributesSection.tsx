import React, { useState, useMemo } from "react";
import { Select } from "../../ui/select";

const RECENT_ATTRIBUTE_KEY = 'recent_attribute_ids';

const getRecentAttributeIds = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(RECENT_ATTRIBUTE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

const addRecentAttributeId = (id: string) => {
    if (typeof window === 'undefined') return;
    try {
        const recent = getRecentAttributeIds();
        const updated = [...new Set([id, ...recent])].slice(0, 10);
        localStorage.setItem(RECENT_ATTRIBUTE_KEY, JSON.stringify(updated));
    } catch {
        // ignore
    }
};
import {
    Attribute,
    AttributeValue,
} from "../../../services/products/types/product-form.types";
import { Card } from "@/components/ui";

interface AttributesSectionProps {
    attributes: Attribute[];
    onChange: (attributes: Attribute[], resetType?: 'pricing' | 'weight' | 'media' | 'stock' | 'all') => void;
    categoriesSelected?: boolean;
    isLoadingAvailableAttributes?: boolean;
    availableAttributes?: Array<{ 
        id: string; 
        parentId?: string;
        parentValueId?: string; // Added
        name: string; 
        displayName: string; 
        values: Array<{ 
            id: string; 
            parentId?: string; // Added
            value: string; 
            displayValue: string 
        }> 
    }>;
    errors?: Record<string, string | boolean>;
}

export const AttributesSection: React.FC<AttributesSectionProps> = ({
    attributes,
    onChange,
    categoriesSelected = false,
    isLoadingAvailableAttributes = false,
    availableAttributes = [],
    errors = {},
}) => {
    const [recentAttributeIds, setRecentAttributeIds] = useState<string[]>(() => getRecentAttributeIds());
    const eligibleAttributes = useMemo(
        () => availableAttributes.filter((attr) => !attr.parentId),
        [availableAttributes]
    );

    const handleAttributesSelectChange = (values: string | string[]) => {
        const selectedIds = Array.isArray(values)
            ? values.filter(Boolean)
            : values
                ? [values]
                : [];
        const previousSelectedId = attributes[0]?.id;
        const nextSelectedId = selectedIds[0];
        const selectionChanged = previousSelectedId !== nextSelectedId;

        const newAttributes: Attribute[] = [];
        
        for (const attrId of selectedIds) {
            const existingAttr = attributes.find(a => a.id === attrId);
            if (existingAttr) {
                newAttributes.push(existingAttr);
            } else {
                const selectedAttr = availableAttributes.find(a => a.id === attrId);
                if (selectedAttr) {
                    addRecentAttributeId(attrId);
                    newAttributes.push({
                        id: selectedAttr.id,
                        name: selectedAttr.name,
                        values: [],
                        order: newAttributes.length,
                    });
                }
            }
        }

        newAttributes.forEach((attr, index) => {
            attr.order = index;
        });

        
        onChange(newAttributes, selectionChanged ? 'all' : undefined);
    };

    const handleRemoveAttribute = (attributeId: string) => {
        // When removing an attribute, clear all variant data (pricing, weights, media, stock)
        // because the existing combinations become invalid
        onChange(attributes.filter((attr) => attr.id !== attributeId), 'all');
    };

    const handleUpdateValues = (attributeId: string, newValues: AttributeValue[]) => {
        const updated = attributes.map((attr) => {
            if (attr.id === attributeId) {
                return { ...attr, values: newValues };
            }
            return attr;
        });
        onChange(updated);
    };

    const handleAddValue = (attributeId: string, value: string, valueId?: string) => {
        if (!value.trim()) return;

        const updated = attributes.map((attr) => {
            if (attr.id === attributeId) {
                // Look up the actual value ID from availableAttributes if not provided
                let actualValueId = valueId;
                if (!actualValueId) {
                    const availableAttr = availableAttributes.find(a => a.id === attributeId);
                    const availableValue = availableAttr?.values.find(v => v.value === value.trim());
                    actualValueId = availableValue?.id;
                }
                
                // If we still don't have an ID, skip adding this value
                if (!actualValueId) {
                    console.warn('Could not find value ID for:', value);
                    return attr;
                }

                const newValue: AttributeValue = {
                    id: actualValueId,
                    value: value.trim(),
                    order: 0,
                };
                return { ...attr, values: [newValue] };
            }
            return attr;
        });

        onChange(updated);
    };

    const handleRemoveValue = (attributeId: string, valueId: string) => {
        const updated = attributes.map((attr) => {
            if (attr.id === attributeId) {
                return {
                    ...attr,
                    values: attr.values.filter((val) => val.id !== valueId),
                };
            }
            return attr;
        });

        onChange(updated);
    };
    return (
        <Card>
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold ">
                        Attributes Configuration
                    </h2>
                    {errors['attributes'] && (
                        <p className="text-sm text-red-500 mt-1">{errors['attributes']}</p>
                    )}
                </div>
                {attributes.length > 0 && (
                    <div className="text-primary rounded-r1">
                        <span className="font-semibold">{attributes.length}</span> attribute
                        {attributes.length !== 1 ? "s" : ""} selected
                    </div>
                )}
            </div>

            <div className="flex gap-5">
                <div className="flex-1">
                    <Select
                        label="Select Attribute"
                        value={attributes.map(a => a.id)}
                        onChange={handleAttributesSelectChange}
                        options={(() => {
                            const eligible = eligibleAttributes;
                            const recent = eligible.filter(attr => recentAttributeIds.includes(attr.id));
                            const rest = eligible.filter(attr => !recentAttributeIds.includes(attr.id));
                            // Sort recent by last-used order
                            recent.sort((a, b) => recentAttributeIds.indexOf(a.id) - recentAttributeIds.indexOf(b.id));

                            return [
                                ...recent.map(attr => ({
                                    value: attr.id,
                                    label: `${attr.name} (${attr.displayName})`,
                                    group: 'Recently Used',
                                })),
                                ...rest.map(attr => ({
                                    value: attr.id,
                                    label: `${attr.name} (${attr.displayName})`,
                                    group: recent.length > 0 ? 'All Attributes' : undefined,
                                })),
                            ];
                        })()}
                        search={true}
                        multiple={true}
                        disabled={!categoriesSelected || isLoadingAvailableAttributes || eligibleAttributes.length === 0}
                        onOpenChange={(isOpen) => {
                            if (!isOpen) {
                                setRecentAttributeIds(getRecentAttributeIds());
                            }
                        }}
                    />
                    {!categoriesSelected && (
                        <p className="mt-2 text-sm text-gray-500">
                            Select at least one category to load attribute options.
                        </p>
                    )}
                    {categoriesSelected && isLoadingAvailableAttributes && (
                        <p className="mt-2 text-sm text-gray-500">
                            Loading attributes for the selected categories...
                        </p>
                    )}
                    {categoriesSelected && !isLoadingAvailableAttributes && eligibleAttributes.length === 0 && (
                        <p className="mt-2 text-sm text-gray-500">
                            No attributes are available for the selected categories.
                        </p>
                    )}
                </div>
            </div>

            {attributes.length > 0 && (
                <div className="flex flex-col gap-5">
                    {attributes.map((attribute, index) => {
                        const availableAttr = availableAttributes.find(a => a.id === attribute.id);
                        
                        return (
                            <AttributeCard
                                key={attribute.id}
                                id={`attributes.${index}.values`}
                                attribute={attribute}
                                index={index}
                                totalAttributes={attributes.length}
                                onAddValue={handleAddValue}
                                onRemoveValue={handleRemoveValue}
                                onUpdateValues={handleUpdateValues}
                                onRemove={handleRemoveAttribute}
                                availableAttr={availableAttr}
                                allAttributes={availableAttributes} // Pass all attributes for deep linking
                            />
                        );
                    })}
                </div>
            )}
        </Card>
    );
};

// Attribute Card Component
interface AttributeCardProps {
    attribute: Attribute;
    index: number;
    totalAttributes: number;
    onAddValue: (attributeId: string, value: string, valueId?: string) => void;
    onRemoveValue: (attributeId: string, valueId: string) => void;
    onUpdateValues: (attributeId: string, values: AttributeValue[]) => void;
    onRemove: (attributeId: string) => void;
    availableAttr?: { 
        id: string; 
        parentId?: string;
        parentValueId?: string;
        name: string; 
        displayName: string; 
        values: Array<{ 
            id: string; 
            parentId?: string;
            value: string; 
            displayValue: string 
        }> 
    };
    allAttributes?: Array<any>; // Added
    id?: string;
}

const AttributeCard: React.FC<AttributeCardProps> = ({
    attribute,
    index,
    totalAttributes,
    onAddValue,
    onRemoveValue,
    onUpdateValues,
    onRemove,
    availableAttr,
    allAttributes = [],
    id,
}) => {
    const selectedValues = attribute.values.map(v => v.value);

    // Sort and format options to show hierarchy
    const options = React.useMemo(() => {
        if (!availableAttr?.values) return [];

        const result: { value: string; label: string; originalId: string }[] = [];

        // Helper to find descendants recursively
        // Current Attr -> Value -> Child Link Attr -> Values -> Recurse
        const findDescendants = (currentAttrId: string, currentValueId: string, currentLabelPath: string): { value: string, id: string }[] => {
            // Helper to handle inconsistent API naming (camelCase vs snake_case)
            const getParentId = (item: any) => item.parentId ?? item.parent_id;
            // Fix: Log showed values use 'parentId' to refer to parent value id
            const getParentValueId = (item: any) => item.parentValueId ?? item.parent_value_id ?? item.parentId;

            // Find attributes that are children of currentAttrId 
            const childAttrs = (allAttributes || []).filter(attr => 
                String(getParentId(attr)) === String(currentAttrId)
            );

            // If no dependent attributes, this is a leaf
            if (childAttrs.length === 0) {
                return [{ value: currentLabelPath, id: currentValueId }];
            }

            let hasChildrenValues = false;
            let descendants: { value: string; id: string }[] = [];

            childAttrs.forEach(childAttr => {
                const childValues = childAttr.values || [];
                // Find values in this child attribute that link to our current value
                const relevantValues = childValues.filter((v: any) => 
                    String(getParentValueId(v)) === String(currentValueId)
                );
                
                if (relevantValues.length > 0) {
                    hasChildrenValues = true;
                    relevantValues.forEach((childVal: any) => {
                        // Use value_en as fallback if value is missing
                        const valStr = childVal.value || childVal.value_en || childVal.val;
                        const newPath = `${currentLabelPath} > ${valStr}`;
                        const subDescendants = findDescendants(childAttr.id, childVal.id, newPath);
                        descendants = [...descendants, ...subDescendants];
                    });
                }
            });

            // If child attributes exist but NO matching child values for this specific value,
            // treat it as a leaf and show it as a selectable option.
            if (!hasChildrenValues) {
                return [{ value: currentLabelPath, id: currentValueId }];
            }

            return descendants;
        };

        // Start processing from root values of the current attribute
        availableAttr.values.forEach(rootVal => {
             // If we're at availableAttr, allow recursion
             // Ensure we grab the display value correctly
             const rootValStr = rootVal.value || (rootVal as any).value_en;
             const leaves = findDescendants(availableAttr.id, rootVal.id, rootValStr);
             
             leaves.forEach(leaf => {
                 result.push({ 
                     value: leaf.value, // This is the label we show and select
                     label: leaf.value,
                     originalId: leaf.id // Store the actual leaf ID
                 });
             });
        });

        // Deduplicate by originalId to prevent duplicate option keys and values
        const seen = new Set<string>();
        return result.filter(opt => {
            if (seen.has(opt.originalId)) return false;
            seen.add(opt.originalId);
            return true;
        });
    }, [availableAttr, allAttributes]);

    const handleValuesChange = (values: string | string[]) => {
        const newValues = (Array.isArray(values) ? values : [values])
            .filter(Boolean)
            .slice(0, 1);
        
        // Build the complete new values array with proper IDs and order
        const updatedValues: AttributeValue[] = newValues.map((value, index) => {
            // Check if this value already exists in the current attribute
            const existingValue = attribute.values.find(v => v.value === value);
            if (existingValue) {
                return { ...existingValue, order: index };
            }
            
            // Find the option to get the correct ID
            const option = options.find(o => o.value === value);
            
            // Fallback to searching locally if option strict match failed
            const valueObj = availableAttr?.values.find(v => v.value === value);
            
            return {
                id: option?.originalId || valueObj?.id || value,
                value: value,
                order: index,
            };
        });
        
        // Call parent's handleUpdateValues to update all values at once
        onUpdateValues(attribute.id, updatedValues);
    };

    return (
        <Card id={id} variant="nested">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-1">
                    <div className="flex justify-center items-center gap-5">
                        <h4 className="text-lg font-semibold ">
                            {attribute.name}
                        </h4>
                        <h4 className="text-lg ">
                            {attribute.values.length} value(s)
                        </h4>
                    </div>

                </div>
                <button
                    onClick={() => onRemove(attribute.id)}
                    className="text-danger hover:text-danger2"
                    title="Remove attribute"
                >
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>


            <div className="flex gap-5">
                {options.length > 0 && (
                    <div className="flex-1">
                        <Select
                            label="Select Value"
                            value={selectedValues[0] || ""}
                            onChange={handleValuesChange}
                            options={options}
                            search={true}
                            multiple={false}
                        />
                    </div>
                )}
            </div>
        </Card>
    );
};
