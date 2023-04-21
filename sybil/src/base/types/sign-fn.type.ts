/** Sign func take message as input, returns base64 encoded signature */
export type SignFn = (args: { message: string }) => Promise<string>;
