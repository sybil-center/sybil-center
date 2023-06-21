export type AnyObj = { [key: string]: any }

/**
 * Extract properties from origin object to new object
 * @param obj origin object
 * @param props props of origin object which will be extracted to new object
 */
export function extractProps<T extends AnyObj = AnyObj>(obj: T, props?: string[]): Partial<T> {
  if (!props) return {};
  const keys = Object.keys(obj);
  const newProps = keys.filter((key) => props.includes(key));
  const newObj: AnyObj = {};
  newProps.forEach((prop) => newObj[prop] = obj[prop]);
  return newObj as Partial<T>;
}

export const objUtil = {
  extractProps: extractProps,
  cleanUndefined: (obj: { [key: string]: any }) => {
    Object
      .keys(obj)
      .forEach((key) => (<any>obj)[key] === undefined && delete (<any>obj)[key]);
  }
};
