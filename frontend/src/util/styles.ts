export function cn(...classNames: string[]): string {
  return classNames.reduce((a, b) => a + " " + b);
}
