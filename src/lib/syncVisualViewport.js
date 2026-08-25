// mirror visual viewport size and offset into css custom properties for mobile layout
export function syncVisualViewport() {
  if (typeof window === "undefined") {
    return () => {};
  }

  const documentRoot = document.documentElement;

  const updateViewportCssVariables = () => {
    const visualViewport = window.visualViewport;

    if (!visualViewport) {
      documentRoot.style.setProperty("--app-height", "100vh");
      documentRoot.style.setProperty("--vv-height", "100vh");
      documentRoot.style.setProperty("--vv-width", "100vw");
      documentRoot.style.setProperty("--vv-offset-top", "0px");
      documentRoot.style.setProperty("--vv-offset-left", "0px");
      return;
    }

    documentRoot.style.setProperty(
      "--app-height",
      `${visualViewport.height}px`,
    );
    documentRoot.style.setProperty("--vv-height", `${visualViewport.height}px`);
    documentRoot.style.setProperty("--vv-width", `${visualViewport.width}px`);
    documentRoot.style.setProperty(
      "--vv-offset-top",
      `${visualViewport.offsetTop}px`,
    );
    documentRoot.style.setProperty(
      "--vv-offset-left",
      `${visualViewport.offsetLeft}px`,
    );
  };

  updateViewportCssVariables();

  const visualViewport = window.visualViewport;
  if (!visualViewport) {
    window.addEventListener("resize", updateViewportCssVariables);
    return () =>
      window.removeEventListener("resize", updateViewportCssVariables);
  }

  visualViewport.addEventListener("resize", updateViewportCssVariables);
  visualViewport.addEventListener("scroll", updateViewportCssVariables);
  window.addEventListener("resize", updateViewportCssVariables);
  window.addEventListener("orientationchange", updateViewportCssVariables);

  return () => {
    visualViewport.removeEventListener("resize", updateViewportCssVariables);
    visualViewport.removeEventListener("scroll", updateViewportCssVariables);
    window.removeEventListener("resize", updateViewportCssVariables);
    window.removeEventListener("orientationchange", updateViewportCssVariables);
  };
}

// detect touch-first devices so the app can apply mobile-specific layout classes
export function isTouchViewport() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0
  );
}
