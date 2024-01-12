
export function popupFeatures(): string {
  const width = 700;
  const height = 700;
  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 4;
  return `
    popup,
    width=${width},
    height=${height},
    left=${left},
    top=${top},
    status=no,
    location=no
    `
}
