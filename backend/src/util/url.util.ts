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
