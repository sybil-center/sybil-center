import { Identifier, isStrictId, zcredjs } from "@zcredjs/core";
import { Es256kJwk } from "../services/jws.verifier.service.js";

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
  const _id = normalizeZcredId(id);
  return `${_id.type}:${_id.key}`;
}

export function normalizeZcredId(id: Identifier): Identifier {
  if (isStrictId(id)) {
    return zcredjs.normalizeId(id);
  }
  return id;
}

/**
 * Returns URL domain
 * @param url
 * @param options
 * @return string domain
 */
export function getDomain(
  url: URL | string,
  options?: {
    /** 1 => com, 2 => example.com */
    untilLevel: number
  }
): string {
  const _url = typeof url === "string" ? new URL(url) : url;
  const _options = options ? options : { untilLevel: 2 };
  const hostname = _url.hostname;
  const domains = hostname.split(".");
  const lastIndex = domains.length - 1;
  const returnDomain = [];
  for (let i = 0; i < _options.untilLevel; i++) {
    returnDomain[lastIndex - i] = domains[lastIndex - i];
  }
  return [returnDomain].join(".");
}

export function jwkToZcredId(jwk: Es256kJwk): Identifier {
  const type = `${jwk.crv}:publickey`;
  const key = `${jwk.x}${jwk.y}`;
  return {
    type,
    key
  };
}

export function extractBearerToken(str: string): string  {
  return str.slice(7)
}