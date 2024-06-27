/**
 *  Project root directory
 *  before build: <project_path>/src
 *  after build: <project_path>/dist
 */
const _rootdir = new URL(`../`, import.meta.url).href;

export const ROOT_DIR = _rootdir.endsWith("/")
  ? new URL(_rootdir)
  : new URL(`${_rootdir}/`);
