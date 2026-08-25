// reset scroll position after route change, using lenis when available
export function resetScrollPosition(lenisInstance) {
  if (lenisInstance) {
    lenisInstance.scrollTo(0, { immediate: true });
    return;
  }

  window.scrollTo(0, 0);
}
