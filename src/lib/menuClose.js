// broadcast menu close so open drawers and overlays can dismiss on navigation
export function dispatchMenuClose() {
  window.dispatchEvent(new CustomEvent("menu:close"));
}
