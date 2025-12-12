import { useEffect, useRef, useState } from "react";

export function useAnchorRect<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const update = () => {
    if (ref.current) {
      setRect(ref.current.getBoundingClientRect());
    }
  };

  useEffect(() => {
    const handler = () => update();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, []);

  return { ref, rect, update };
}

