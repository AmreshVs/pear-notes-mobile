import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    // Target modern WebView — WKWebView on iOS 16+ and Android Chrome 100+
    target: 'esnext',
    // Inline all assets (CSS, fonts, images) into the single HTML file
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    // Keep the output readable enough for debugging
    minify: 'esbuild',
    rollupOptions: {
      output: {
        // One JS chunk inlined into the HTML
        inlineDynamicImports: true,
      },
    },
  },
  // No public dir needed — everything is in src/
  publicDir: false,
})
