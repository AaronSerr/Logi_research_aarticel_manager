/**
 * CleanTextarea Component
 * A textarea that automatically cleans pasted text to remove PDF line breaks.
 * Uses the cleanText() function to intelligently merge mid-sentence line breaks
 * while preserving paragraph breaks (lines ending with . ! ?).
 */

import React, { useRef } from 'react';
import { cleanText } from '../../utils/text';

interface CleanTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  required?: boolean;
  id?: string;
}

export function CleanTextarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  className = '',
  required = false,
  id,
}: CleanTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const cleanedText = cleanText(pastedText);

    // Get current cursor position
    const textarea = e.currentTarget;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Insert cleaned text at cursor position (or replace selection)
    const newValue = value.slice(0, start) + cleanedText + value.slice(end);
    onChange(newValue);

    // Restore cursor position after cleaned text
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = start + cleanedText.length;
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        textareaRef.current.focus();
      }
    }, 0);
  };

  return (
    <textarea
      ref={textareaRef}
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onPaste={handlePaste}
      placeholder={placeholder}
      rows={rows}
      className={className}
      required={required}
    />
  );
}

export default CleanTextarea;
