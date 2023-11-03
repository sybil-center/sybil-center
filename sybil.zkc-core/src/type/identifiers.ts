export const ID_TYPES = [0, 1, 2] as const;
export type IDType = typeof ID_TYPES[number];

export function isIdType(num: number): num is IDType {
  return ID_TYPES
    // @ts-ignore
    .includes(num);
}

export const ID_NAMES = [
  "MinaPublicKey",
  "EthereumAddress",
  "Secp256k1PublicKey"
] as const;
export type IDName = typeof ID_NAMES[number];

export function isIdName(name: string): name is IDName {
  return ID_NAMES
    // @ts-ignore
    .includes(name);
}

const ID_NAME_MAP: Record<IDType, IDName> = {
  0: "MinaPublicKey",
  1: "EthereumAddress",
  2: "Secp256k1PublicKey"
};

const NAME_ID_MAP: Record<IDName, IDType> = {
  MinaPublicKey: 0,
  EthereumAddress: 1,
  Secp256k1PublicKey: 2
};

export function toIdType(name: string | number): IDType {
  if (typeof name === "number") {
    if (isIdType(name)) return name;
    throw new Error(`Can not find id type by id type ${name}`);
  } else {
    if (isIdName(name)) return NAME_ID_MAP[name];
    throw new Error(`Can not find id type by id name ${name}`);
  }
}

export function toIdName(type: string | number): IDName {
  if (typeof type === "number") {
    if (isIdType(type)) return ID_NAME_MAP[type];
    throw new Error(`Can not find id name by id type ${type}`);
  } else {
    if (isIdName(type)) return type;
    throw new Error(`Can not find id name ${type}`);
  }
}

