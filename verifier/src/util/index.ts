import { Identifier, isStrictId, zcredjs } from "@zcredjs/core";

/**
 *  Project root directory
 *  before build: <project_path>/src
 *  after build: <project_path>/dist
 */
const _rootdir = new URL(`../`, import.meta.url).href;

export const ROOT_DIR = _rootdir.endsWith("/")
  ? new URL(_rootdir)
  : new URL(`${_rootdir}/`);

export function stringifyZCredtId(id: Identifier): string {
  if (isStrictId(id)) {
    const _id = zcredjs.normalizeId(id);
    return `${_id.type}:${_id.key}`;
  }
  return `${id.type}:${id.key}`;
}