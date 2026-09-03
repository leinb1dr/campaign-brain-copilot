// Tauri serves the built files from disk, so there is no server to render on.
export const ssr = false;

// Emit an HTML shell per route so a reload inside the webview resolves to a real file.
export const prerender = true;
