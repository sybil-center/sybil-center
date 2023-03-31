import { randomUUID } from "crypto";

/**
 * Return string ${uuid}-${time in milliseconds}
 */
export function absoluteId() {
  return `${randomUUID()}-${new Date().getTime()}`;
}
