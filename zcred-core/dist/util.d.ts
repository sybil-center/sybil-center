export declare function repeatUtil<T>(shouldStop: (t: T | Error) => boolean, betweenMS: number, fn: () => Promise<T>): Promise<T | Error>;
