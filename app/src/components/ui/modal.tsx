/**
 * Modal Component
 * Reusable modal dialog with backdrop and animations
 */

"use client";

import React, { useEffect, useState, useContext } from "react";
import { IconButton } from "./icon-button";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  closeOnBackdrop?: boolean;
  footer?: React.ReactNode;
  className?: string; // Appended to the wrapper div
  contentClassName?: string; // Appended to the inner content container div
  variant?: 'default' | 'transparent';
  scrollable?: boolean; // Defaults to true. If false, wrapper becomes overflow-visible and inner container loses overflow-y-auto
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  closeOnBackdrop = true,
  className = "",
  contentClassName = "",
  variant = 'default',
  scrollable = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle modal visibility with animation
  useEffect(() => {
    if (isOpen) {
      // Show modal and start animation
      setShouldRender(true);
      setIsVisible(true);
      // Trigger animation after render with small delay
      const animTimer = setTimeout(() => {
        setIsAnimating(true);
      }, 10);
      return () => clearTimeout(animTimer);
    } else if (shouldRender) {
      // Start closing animation
      setIsAnimating(false);
      // Wait for animation to complete before hiding
      const timer = setTimeout(() => {
        setIsVisible(false);
        setShouldRender(false);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      }
    };

    // Use capture phase to intercept before next.js router or other handlers
    document.addEventListener("keydown", handleEscape, { capture: true });
    return () => document.removeEventListener("keydown", handleEscape, { capture: true });
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!shouldRender) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6
        bg-black/50 backdrop-blur-sm
        transition-opacity duration-300 ease-out
        ${isAnimating ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={handleBackdropClick}
    >
      <div
        className={`
          relative w-full max-h-[95vh] rounded-xl shadow-xl
          flex flex-col ${scrollable ? 'overflow-hidden' : 'overflow-visible'}
          transition-all duration-300 ease-out
          ${variant === 'default' ? 'bg-white' : ''}
          ${isAnimating
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-4'
          } ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header/Close Button Section (if we want close button absolutely positioned, we can keep it here, 
            but using a flex layout with overflow-y-auto is better) */}
        <IconButton
          onClick={onClose}
          variant="cancel"
          className="absolute top-4 right-4 z-10 bg-white/50 hover:bg-gray-100 rounded-full"
        />

        {/* Content Container */}
        <div className={`flex flex-col flex-1 justify-center items-center ${scrollable ? 'overflow-y-auto' : ''} ${variant === 'default' ? 'p-6 md:p-8' : ''} ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
};