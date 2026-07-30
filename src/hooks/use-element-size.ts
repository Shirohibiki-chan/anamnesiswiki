// Tracks an element's pixel size via ResizeObserver. react-arborist needs
// explicit width/height (it doesn't auto-size itself), and the tree panel
// lives in a flexible layout, so its size has to be measured at runtime.
import { useEffect, useRef, useState, type RefObject } from "react";

export function useElementSize<T extends HTMLElement>(): [RefObject<T | null>, { width: number; height: number }] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
