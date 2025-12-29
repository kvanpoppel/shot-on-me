/**
 * Elements Coordinator - Deterministic mount/unmount for Stripe Elements
 * 
 * Prevents nested Elements by ensuring proper unmounting before mounting new ones.
 * Uses microtasks and requestAnimationFrame for deterministic timing.
 */

/**
 * Small helper to await a safe React/microtask + next-frame tick
 * 
 * @param waitMs Optional additional delay in milliseconds (default: 0)
 * @returns Promise that resolves when safe to mount new Elements
 */
export async function nextFrameTick(waitMs = 0): Promise<void> {
  await new Promise<void>(r => queueMicrotask(r))
  if (waitMs > 0) await new Promise<void>(r => setTimeout(r, waitMs))
  await new Promise<void>(r => requestAnimationFrame(() => r()))
}

// Backward compatibility alias
export const unmountRootElementsPromise = nextFrameTick

