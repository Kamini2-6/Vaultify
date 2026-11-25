import { useEffect } from 'react';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'touchstart'] as const;

/** Calls onLock after `ms` of no user activity. Any activity restarts the timer. */
export function useAutoLock(active: boolean, ms: number, onLock: () => void): void {
  useEffect(() => {
    if (!active) return;
    let timer = window.setTimeout(onLock, ms);
    const reset = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(onLock, ms);
    };
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, reset);
    return () => {
      window.clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, reset);
    };
  }, [active, ms, onLock]);
}