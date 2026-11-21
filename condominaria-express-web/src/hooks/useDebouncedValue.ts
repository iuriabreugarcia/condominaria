import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedValue(value);
    }, Math.max(0, delay));

    return () => {
      window.clearTimeout(timeout);
    };
  }, [value, delay]);

  return debouncedValue;
}
