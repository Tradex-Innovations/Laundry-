export type Theme = "light" | "dark";
export const THEME_STORAGE_KEY = "laundry.prototype4.theme";

// Run before the page paints so a saved dark theme doesn't flash a light canvas.
export const themeInitScript = `(() => {
  let saved;
  try { saved = localStorage.getItem("${THEME_STORAGE_KEY}"); } catch {}
  const theme = saved === "light" || saved === "dark" ? saved :
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = theme;
})();`;
