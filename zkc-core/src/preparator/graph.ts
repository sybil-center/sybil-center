import * as u8a from "uint8arrays";
import ieee754 from "ieee754";

function isStr(encoding: u8a.SupportedEncodings) {
  return (value: any) => {
    const isstr = typeof value === "string";
    let result = true;
    try {
      u8a.fromString(value, encoding);
    } catch (e) {
      result = false;
    }
    return isstr && result;
  };
}

function isUint(num: number) {
  const bignum = BigInt(num);
  const max = 2n ** bignum - 1n;
  return (value: any): boolean => {
    if (typeof value === "number" || typeof value === "bigint") {
      const targetNum = typeof value === "number" ? BigInt(value) : value;
      return 0n <= targetNum && targetNum <= max;
    }
    return false;
  };
}

function isInt(num: number) {
  const bignum = BigInt(num);
  const max = ((2n ** bignum) / 2n) - 1n;
  const min = -((2n ** bignum) / 2n);
  return (value: any): boolean => {
    if (typeof value === "number" || typeof value === "bigint") {
      const targetNum = typeof value === "number" ? BigInt(value) : value;
      return min <= targetNum && targetNum <= max;
    }
    return false;
  };
}

export type GraphNode = {
  name: string;
  isType: (value: any) => boolean
  spread?: boolean;
}

export type GraphLink = {
  inputType: string;
  outputType: string;
  name: string;
  transform: (value: any) => any;
}

const BASE_NODES: Record<string, GraphNode> = {
  utf8: {
    name: "utf8",
    isType: isStr("utf-8")
  },
  base64: {
    name: "base64",
    isType: isStr("base64")
  },
  base32: {
    name: "base32",
    isType: isStr("base32upper")
  },
  base16: {
    name: "base16",
    isType: isStr("base16upper")
  },
  hex: {
    name: "hex",
    isType: isStr("hex")
  },
  base64url: {
    name: "base64url",
    isType: isStr("base64url")
  },
  base58: {
    name: "base58",
    isType: isStr("base58btc")
  },
  ascii: {
    name: "ascii",
    isType: isStr("ascii")
  },
  uint16: {
    name: "uint16",
    isType: isUint(16)
  },
  uint32: {
    name: "uint32",
    isType: isUint(32)
  },
  uint64: {
    name: "uint64",
    isType: isUint(64)
  },
  uint128: {
    name: "uint128",
    isType: isUint(128)
  },
  uint256: {
    name: "uint256",
    isType: isUint(256)
  },
  int16: {
    name: "int16",
    isType: isInt(16)
  },
  int32: {
    name: "int32",
    isType: isInt(32)
  },
  int64: {
    name: "int64",
    isType: isInt(64)
  },
  int128: {
    name: "int128",
    isType: isInt(128)
  },
  int256: {
    name: "int256",
    isType: isInt(256)
  },
  float32: {
    name: "float32",
    isType: (value: any) => typeof value === "number"

  },
  boolean: {
    name: "boolean",
    isType: (value: any) => typeof value === "boolean"
  },
  bytes: {
    name: "bytes",
    spread: true,
    isType: (value: any) => value instanceof Uint8Array
  },
  uint: {
    name: "uint",
    isType: (value: any) => {
      if (typeof value === "number") {
        return value >= 0 && Number.isInteger(value);
      }
      return typeof value === "bigint" && value >= 0n;
    }
  }
};

function defaultLinks(): Record<string, GraphLink> {
  return Object
    .keys(BASE_NODES)
    .reduce((prev, current) => {
      if (current.startsWith("int") || current.startsWith("uint")) {
        prev[current] = {
          inputType: current,
          outputType: current,
          name: current,
          transform: value => BigInt(value)
        };
      } else {
        prev[current] = {
          inputType: current,
          outputType: current,
          name: current,
          transform: value => value
        };
      }
      return prev;
    }, {} as Record<string, GraphLink>);
}

function toBigInt(bytes: Uint8Array): bigint {
  const reversedBytes = bytes.reverse();
  let result = BigInt(0);
  for (let i = reversedBytes.length - 1; i >= 0; i--) {
    result = result * BigInt(256) + BigInt(bytes[i]!);
  }
  return result;
}

function numToBytes(num: number | bigint): Uint8Array {
  let target = typeof num === "number" ? BigInt(num) : num;
  const bytes: number[] = [];
  let count = 0;
  while (target !== 0n) {
    bytes[count] = Number(target % 256n);
    count++;
    target = target / 256n;
  }
  return new Uint8Array(bytes.reverse());
}

const uintMap: Record<string, { max: bigint | null, numBytes: number | null }> = {
  uint: { max: null, numBytes: null },
  uint16: { max: 2n ** 16n - 1n, numBytes: 2 },
  uint32: { max: 2n ** 32n - 1n, numBytes: 4 },
  uint64: { max: 2n ** 64n - 1n, numBytes: 8 },
  uint128: { max: 2n ** 128n - 1n, numBytes: 16 },
  uint256: { max: 2n ** 128n - 1n, numBytes: 32 }
};

// @ts-ignore
function uintToBytes(): Record<string, GraphLink> {
  const result: Record<string, GraphLink> = {};
  for (const uintName in uintMap) {
    const uint = uintMap[uintName]!;
    result[`${uintName}-bytes`] = {
      name: `${uintName}-bytes`,
      inputType: uintName,
      outputType: "bytes",
      transform: (value: number | bigint): Uint8Array => {
        const bytes = numToBytes(value);
        if (uint.numBytes && uint.numBytes > bytes.length) {
          const zeroes = new Array<number>(uint.numBytes - bytes.length).fill(0);
          return new Uint8Array([...zeroes, ...bytes]);
        } else if (uint.numBytes && uint.numBytes < bytes.length) {
          throw new Error(`Transformation Graph: link ${uintName}-bytes, throw error because bytes length more than max bytes length ${uint.numBytes}`);
        }
        return bytes;
      }
    };
  }
  return result;
}

const uints = [
  "uint",
  "uint16",
  "uint32",
  "uint64",
  "uint128",
  "uint256",
];

function bytesToUint(): Record<string, GraphLink> {
  return uints.reduce((prev, name) => {
    prev[`bytes-${name}`] = {
      inputType: "bytes",
      outputType: name,
      name: `bytes-${name}`,
      transform: toBigInt
    };
    return prev;
  }, {} as Record<string, GraphLink>);
}

const intsMap: Record<string, { num: number, bnum: bigint }> = {
  int16: { num: 16, bnum: 16n },
  int32: { num: 32, bnum: 32n },
  int64: { num: 64, bnum: 64n },
  int128: { num: 128, bnum: 128n },
  int256: { num: 256, bnum: 256n }
};

function bytesToInt(): Record<string, GraphLink> {
  return Object.keys(intsMap)
    .reduce((prev, name) => {
      prev[`bytes-${name}`] = {
        inputType: "bytes",
        outputType: name,
        name: name,
        transform: (bytes: Uint8Array) => {
          const nBits = intsMap[name]!;
          if (bytes.length > nBits.num / 8) {
            throw new Error(`Graph transformation bytes-${name} error, more then ${nBits.num} bits`);
          }
          const max = ((2n ** nBits.bnum) / 2n) - 1n;
          const target = toBigInt(bytes);
          return target > max ? -(target - max) : target;
        }
      };
      return prev;
    }, {} as Record<string, GraphLink>);
}

function intsToBytes(): Record<string, GraphLink> {
  return Object.keys(intsMap)
    .reduce((prev, name) => {
      prev[`${name}-bytes`] = {
        inputType: name,
        outputType: "bytes",
        name: `${name}-bytes`,
        transform: (value: number | bigint): Uint8Array => {
          const num = typeof value === "number" ? BigInt(value) : value;
          const nBits = intsMap[name]!;
          const max = ((2n ** nBits.bnum) / 2n) - 1n;
          const target = num < 0 ? max + (-num) : num;
          return numToBytes(target);
        }
      };
      return prev;
    }, {} as Record<string, GraphLink>);
}

const encAliases: Record<string, u8a.SupportedEncodings> = {
  "utf8": "utf8",
  "base64": "base64",
  "base64url": "base64url",
  "base32": "base32upper",
  "base16": "base16upper",
  "base58": "base58btc",
  "ascii": "ascii",
  "hex": "hex"
};

function bytesToString(): Record<string, GraphLink> {
  return Object.keys(encAliases)
    .reduce((prev, name) => {
      const encoding = encAliases[name]!;
      prev[`bytes-${name}`] = {
        inputType: "bytes",
        outputType: name,
        name: `bytes-${name}`,
        transform: (bytes: Uint8Array) => u8a.toString(bytes, encoding)
      };
      return prev;
    }, {} as Record<string, GraphLink>);
}

function stringToBytes(): Record<string, GraphLink> {
  return Object.keys(encAliases)
    .reduce((prev, name) => {
      const encoding = encAliases[name]!;
      prev[`${name}-bytes`] = {
        inputType: name,
        outputType: "bytes",
        name: `${name}-bytes`,
        transform: (str: string) => u8a.fromString(str, encoding)
      };
      return prev;
    }, {} as Record<string, GraphLink>);
}

function stringsToBoolean(): Record<string, GraphLink> {
  return [
    "utf8",
    "ascii"
  ].reduce((prev, name) => {
    prev[`${name}-boolean`] = {
      inputType: name,
      outputType: "boolean",
      name: `${name}-boolean`,
      transform: (str: string) => {
        if (str === "true" || str === "false") {
          return str === "true";
        }
        throw new Error(`For graph link ${name}-boolean value must to be "true" or "false"`);
      }
    };
    return prev;
  }, {} as Record<string, GraphLink>);
}

function booleanToStrings(): Record<string, GraphLink> {
  return [
    "utf8",
    "ascii"
  ].reduce((prev, name) => {
    prev[`boolean-${name}`] = {
      inputType: "boolean",
      outputType: name,
      name: `boolean-${name}`,
      transform: (bool: boolean): string => bool ? "true" : "false"
    };
    return prev;
  }, {} as Record<string, GraphLink>);
}

function booleanToNumbers(): Record<string, GraphLink> {
  return uints.concat(Object.keys(intsMap))
    .reduce((prev, name) => {
      prev[`boolean-${name}`] = {
        inputType: "boolean",
        outputType: name,
        name: `boolean-${name}`,
        transform: (bool: boolean): bigint => bool ? 1n : 0n
      };
      return prev;
    }, {} as Record<string, any>);
}

function numbersToBoolean(): Record<string, GraphLink> {
  return uints.concat(Object.keys(intsMap))
    .reduce((prev, name) => {
      prev[`${name}-boolean`] = {
        inputType: name,
        outputType: "boolean",
        name: `${name}-boolean`,
        transform: (num: bigint | number): boolean => {
          const target = typeof num === "number" ? BigInt(num) : num;
          if (target === 1n || target === 0n) {
            return target === 1n;
          }
          throw new Error(`For graph link ${name}-boolean ${name} value must be 0 or 1`);
        }
      };
      return prev;
    }, {} as Record<string, GraphLink>);
}

function stringsToNumbers(): Record<string, GraphLink> {
  const result: Record<string, GraphLink> = {};
  ["utf8", "ascii"].forEach((strName) => {
    uints.concat(Object.keys(intsMap))
      .forEach((numName) => {
        result[`${strName}-${numName}`] = {
          inputType: strName,
          outputType: numName,
          name: `${strName}-${numName}`,
          transform: (str: string): bigint => BigInt(str)
        };
      });
  });
  return result;
}

function numbersToStrings(): Record<string, GraphLink> {
  const result: Record<string, GraphLink> = {};
  ["utf8", "ascii"].forEach((strName) => {
    uints.concat(Object.keys(intsMap))
      .forEach((numName) => {
        result[`${numName}-${strName}`] = {
          inputType: numName,
          outputType: strName,
          name: `${numName}-${strName}`,
          transform: (value: bigint | number): string => {
            const target = typeof value === "number" ? BigInt(value) : value;
            return target.toString();
          }
        };
      });
  });
  return result;
}

function stringsToFloat(): Record<string, GraphLink> {
  return ["utf8", "ascii"].reduce((prev, name) => {
    prev[`${name}-float32`] = {
      inputType: name,
      outputType: "float32",
      name: `${name}-float32`,
      transform: (str: string): number => parseFloat(str)
    };
    return prev;
  }, {} as Record<string, GraphLink>);
}

function floatToStrings(): Record<string, GraphLink> {
  return ["utf8", "ascii"].reduce((prev, name) => {
    prev[`float32-${name}`] = {
      inputType: "float32",
      outputType: name,
      name: `float32-${name}`,
      transform: (num: number) => String(num)
    };
    return prev;
  }, {} as Record<string, GraphLink>);
}

const BASE_LINKS: Record<string, GraphLink> = {
  ...defaultLinks(),
  ...bytesToUint(),
  ...uintToBytes(),
  ...bytesToInt(),
  ...intsToBytes(),
  ...bytesToString(),
  ...stringToBytes(),
  ...stringsToBoolean(),
  ...booleanToStrings(),
  ...booleanToNumbers(),
  ...numbersToBoolean(),
  ...stringsToNumbers(),
  ...numbersToStrings(),
  ...stringsToFloat(),
  ...floatToStrings(),
  "bytes-float32": {
    inputType: "bytes",
    outputType: "float32",
    name: "bytes-float32",
    transform: (bytes: Uint8Array): number => {
      return ieee754.read(bytes, 0, true, 23, 4);
    }
  },
  "float32-bytes": {
    inputType: "float32",
    outputType: "bytes",
    name: "float32-bytes",
    transform: (num: number) => {
      const bytes = new Uint8Array(4);
      ieee754.write(bytes, num, 0, true, 23, 4);
      return bytes;
    }
  },
};

export class TransformationGraph {

  private readonly nodes = { ...BASE_NODES };
  private readonly links = { ...BASE_LINKS };

  extend(nodes: GraphNode[], links: GraphLink[]): void {
    nodes.forEach(node => {
      if (this.nodes[node.name]) {
        throw new Error(`Node with name "${node.name}" already exists in transformation graph`);
      }
      this.nodes[node.name] = node;
    });
    links.forEach((link) => {
      if (this.links[link.name]) {
        throw new Error(`Link with name "${link.name}" already exists in transformation graph`);
      }
      this.links[link.name] = link;
    });
  }

  transform<TOut = any, TIn = any>(value: TIn, links: string[]): TOut {
    let result: any = value;
    links.forEach((link) => {
      const targetLink = this.links[link];
      if (!targetLink) {
        throw new Error(`${link} link is not supported by Transformation Graph`);
      }
      const { inputType, outputType, transform } = targetLink;
      const input = this.nodes[inputType];
      if (!input) throw new Error(`Node with name ${inputType} not supported`);
      const output = this.nodes[outputType];
      if (!output) throw new Error(`Node with mat ${outputType} not supported`);

      if (!input.isType(result)) {
        throw new Error(`Invalid transformation, input type ${input.name} is not matched to value`);
      }
      result = transform(result);
      if (!output.isType(result)) {
        throw new Error(`Invalid transformation, output type ${output.name} is not matched to value`);
      }
    });
    return result;
  }

  toLastNode(links: string[]): GraphNode | undefined {
    const lastLink = links[links.length - 1]!;
    const lastType = this.links[lastLink]!.outputType;
    return this.nodes[lastType];
  }

}
