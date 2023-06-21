export async function thrown(fn: () => Promise<any>): Promise<boolean> {
  let thrown = false;
  try {
    await fn();
  } catch (e) {
    thrown = true;
  }
  return thrown;
}
