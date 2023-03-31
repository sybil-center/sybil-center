import dotenv, { type DotenvConfigOutput } from "dotenv";

export type DotenvConfigOptions = {
  path?: string | URL;
  override?: boolean;
};

/**
 * Wrap `dotenv.config` function allowing `path` option to be URL.
 *
 * Should be removed when https://github.com/motdotla/dotenv/pull/720 is released.
 */
export function configDotEnv(
  options?: DotenvConfigOptions
): DotenvConfigOutput {
  // @ts-ignore
  return dotenv.config(options);
}
