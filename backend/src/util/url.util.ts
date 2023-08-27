/**
 * Build url from base, query and fragment
 *
 * @param base base url
 * @param searchParams query, after "?"
 * @param fragment  fragment, after "#"
 */
export function makeURL(
  base: URL | string,
  searchParams: Record<string, string>,
  fragment?: string
): URL {
  const url = new URL(base);
  if (fragment) url.hash = fragment;
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value);
  }
  return url;
}

export const urlUtil = {
  makeURL: makeURL,

  /** Returns domain from URL */
  domain: (url: string | URL): string => {
    if (typeof url === "string") url = new URL(url);
    const hostname = url.hostname;
    const splitHost = hostname.split(".");
    const tld = splitHost[splitHost.length - 1];
    const main = splitHost[splitHost.length - 2];
    if (!tld || !main) throw new Error(`Invalid domain in URL: ${url.href}`);
    return `${main}.${tld}`;
  }
};
