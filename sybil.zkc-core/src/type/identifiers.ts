export const idTypes = [0, 1, 2] as const;
export type IdType = typeof idTypes[number]

export function isIdType(num: number): num is IdType {
  return idTypes
    // @ts-ignore
    .includes(num)
}


