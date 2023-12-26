import type { Decoder } from "io-ts";
import { ThrowDecoder } from "./throw-decoder.util.js";

export type FetchOpts = {
  body: any;
  method: string;
  headers: any;
  signal: AbortSignal;
};

async function fetchJson(
  url: URL | string,
  opts: Partial<FetchOpts> = {}
): Promise<unknown> {
  const res = await fetch(url, {
    credentials: "include" as const,
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...opts.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `HTTP request to '${url}' failed with status '${res.statusText}': ${text}`
    );
  }

  return res.json();
}

async function fetchDecode<A>(
  url: URL | string,
  decoder: Decoder<unknown, A>,
  opts: Partial<FetchOpts> = {}
): Promise<A> {
  const json = await rest.fetchJson(url, opts);
  return ThrowDecoder.decode(decoder, json);
}

export const rest = {
  fetchJson: fetchJson,
  fetchDecode: fetchDecode,
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    return fetch(input, init);
  }
};
