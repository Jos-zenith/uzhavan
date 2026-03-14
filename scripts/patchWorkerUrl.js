/**
 * Webpack loader that patches expo-sqlite's SQLiteModule to use webpack 5's
 * built-in worker syntax (import.meta.url) instead of window.location.href.
 *
 * expo-sqlite v16 creates a web worker with:
 *   new Worker(new URL('./worker', window.location.href))
 *
 * This causes the browser to request /worker from the dev server, which returns
 * index.html (HTML) instead of JavaScript → "Unexpected token '<'" error.
 *
 * Replacing with import.meta.url lets webpack 5 automatically bundle the worker
 * as a separate chunk and provide the correct URL at runtime.
 */
module.exports = function patchWorkerUrl(source) {
  return source.replace(
    "new Worker(new URL('./worker', window.location.href))",
    "new Worker(new URL('./worker', import.meta.url))"
  );
};
