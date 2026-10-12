// Content scripts cannot be ES modules, so this tiny classic script imports the real one.
(async () => {
  const { start } = await import(chrome.runtime.getURL('content/dock.js'));
  start();
})();
