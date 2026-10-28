import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

/**
 * Sets the document title and, after in-app navigation (not on first load), moves keyboard
 * focus to the page's <h1> so screen-reader and keyboard users know the page changed.
 */
export function usePageHeading(title: string) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { key } = useLocation();

  useEffect(() => {
    document.title = `${title} · Trip Splitter`;
  }, [title]);

  useEffect(() => {
    if (key !== 'default') headingRef.current?.focus();
  }, [key]);

  return headingRef;
}
