import { mapPrefix, Prefix } from "../base/types/index.js";

function normalize(subjectId: string) {
  const idEntry = subjectId.split(":");
  const address = idEntry.pop();
  const prefix = idEntry.join(":") as Prefix
  const normalPrefix = mapPrefix.get(prefix);
  if (!normalPrefix) throw new Error(`subject id prefix - ${prefix} is not supported`);
  return `${normalPrefix}:${address}`;
}

export const subjectid = {
  normalize: normalize
}
