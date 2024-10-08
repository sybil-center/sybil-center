
/**
 * Extract properties from origin object to new object
 * @param obj origin object
 * @param props props of origin object which will be extracted to new object
 */
export function extractProps<T extends Record<string, any> = Record<string, any>>(obj: T, props?: string[]): Partial<T> {
  if (!props) return {};
  const keys = Object.keys(obj);
  const newProps = keys.filter((key) => props.includes(key));
  const newObj: Record<string, any> = {}
  newProps.forEach((prop) => newObj[prop] = obj[prop]);
  return newObj as Partial<T>
}
