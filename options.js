const key = document.getElementById('key');
chrome.storage.local.get('apiKey').then(({ apiKey }) => { if (apiKey) key.value = apiKey; });
document.getElementById('save').addEventListener('click', async () => {
  await chrome.storage.local.set({ apiKey: key.value.trim() });
  document.getElementById('msg').textContent = 'Saved.';
});
