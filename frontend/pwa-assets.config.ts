import { defineConfig, minimal2023Preset } from "@vite-pwa/assets-generator/config";

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: {
      ...minimal2023Preset.maskable,
      // Keep dark stone background instead of transparent — looks better on
      // platforms that don't apply a background fill.
      resizeOptions: {
        background: "#1c1917",
      },
    },
  },
  images: ["public/logo.svg"],
});
