export function repeatUntil<T>(
  shouldStop: (t: T | Error) => boolean,
  betweenMS: number,
  fn: () => Promise<T>
) {
  return new Promise<T | Error>(async (resolve) => {
    let shouldProceed = true;
    while (shouldProceed) {
      const result = await execute(fn);
      if (shouldStop(result)) {
        shouldProceed = false;
        return resolve(result);
      }
      await new Promise((resolve1) => setTimeout(resolve1, betweenMS));
    }
  });
}

async function execute<T>(
  fn: () => Promise<T>
): Promise<T | Error> {
  try {
    return await fn();
  } catch (e) {
    return e as Error;
  }
}
