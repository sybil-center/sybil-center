export async function copyTextToClipBoard(text: string): Promise<void> {
  if ("clipboard" in navigator) {
    await navigator.clipboard.writeText(text);
  } else {
    document.execCommand("copy", true, text);
  }
}
