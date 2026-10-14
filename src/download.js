export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  // Keep the link inside the active modal and its URL alive while saving starts.
  (document.querySelector('dialog[open]') || document.body).append(anchor);
  try { anchor.click(); }
  finally {
    setTimeout(() => { anchor.remove(); URL.revokeObjectURL(url); }, 60000);
  }
}
