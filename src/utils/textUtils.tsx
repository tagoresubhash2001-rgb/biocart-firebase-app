import React from 'react';

/**
 * Safely renders text that may contain literal `<br />` or `<br>` tags without
 * displaying raw markup or using dangerous innerHTML.
 */
export const renderSafeLineBreaks = (text?: string): React.ReactNode => {
  if (!text) return null;
  const parts = text.split(/<br\s*\/?>/gi);
  if (parts.length === 1) return text;
  return parts.map((part, index) => (
    <React.Fragment key={index}>
      {index > 0 && <br />}
      {part}
    </React.Fragment>
  ));
};
