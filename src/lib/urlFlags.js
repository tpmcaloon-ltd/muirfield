export function isUrlFlagEnabled(flagName) {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  if (!params.has(flagName)) {
    return false;
  }

  const value = params.get(flagName);
  return value !== "false" && value !== "0";
}
