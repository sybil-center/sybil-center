import { suite } from "uvu";
import * as a from "uvu/assert";
import * as u8a from "uint8arrays";
import { SupportedEncodings } from "uint8arrays";
import { TransformationGraph } from "../src/index.js";

const test = suite("Transformation Graph Tests");

const encodings: {
  name: string,
  alias: SupportedEncodings,
  chars: string
}[] = [
  {
    name: "utf8",
    alias: "utf8",
    chars: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  },
  {
    name: "ascii",
    alias: "ascii",
    chars: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  },
  {
    name: "base64",
    alias: "base64",
    chars: "ABCDIFGHIJKLMNOPQRSTUVWXYZabcdefjhijklmnopqrstuvwxyz0123456789+/"
  },
  {
    name: "base64url",
    alias: "base64url",
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
  },
  {
    name: "base32",
    alias: "base32upper",
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
  },
  {
    name: "base16",
    alias: "base16upper",
    chars: "0123456789ABCDEF"
  },
  {
    name: "hex",
    alias: "hex",
    chars: "0123456789ABCDEF".toLowerCase(),
  },
  {
    name: "base58",
    alias: "base58btc",
    chars: "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
  }
];

test("strings to bytes", () => {
  encodings.forEach((enc) => {
    const str = enc.chars;
    const bytes = u8a.fromString(str, enc.alias);
    const graph = new TransformationGraph();
    const transformed = graph.transform<Uint8Array>(str, [`${enc.name}-bytes`]);
    a.equal(transformed, bytes, `${enc.name}-bytes link is not correct`);
  });
});

test("bytes to string", () => {
  encodings.forEach((enc) => {
    const str = enc.chars;
    const bytes = u8a.fromString(str, enc.alias);
    const graph = new TransformationGraph();
    const transformed = graph.transform<string>(bytes, [`bytes-${enc.name}`]);
    a.is(transformed, str, `bytes-${enc.name} link is not correct`);
  });
});

const nums: {
  name: string,
  max: bigint,
  min: bigint,
  value: bigint,
  aboveMax: bigint
  underMin: bigint
}[] = [
  {
    name: "uint16",
    max: (2n ** 16n) - 1n,
    min: 0n,
    value: (2n ** 16n) - 1n - 1000n,
    aboveMax: (2n ** 16n) - 1n + 1000n,
    underMin: -1n
  },
  {
    name: "uint32",
    max: (2n ** 32n) - 1n,
    min: 0n,
    value: (2n ** 32n) - 1n - 1000n,
    aboveMax: (2n ** 32n) - 1n + 1000n,
    underMin: -1n
  },
  {
    name: "uint64",
    max: (2n ** 64n) - 1n,
    min: 0n,
    value: (2n ** 64n) - 1n - 1000n,
    aboveMax: (2n ** 64n) - 1n + 1000n,
    underMin: -1n
  },
  {
    name: "uint128",
    max: (2n ** 128n) - 1n,
    min: 0n,
    value: (2n ** 128n) - 1n - 1000n,
    aboveMax: (2n ** 128n) - 1n + 1000n,
    underMin: -1n
  },
  {
    name: "uint256",
    max: (2n ** 256n) - 1n,
    min: 0n,
    value: (2n ** 256n) - 1n - 1000n,
    aboveMax: (2n ** 256n) - 1n + 1000n,
    underMin: -1n
  },
  {
    name: "uint",
    max: (2n ** 512n) - 1n,
    min: 0n,
    value: (2n ** 512n) - 1n - 1000n,
    aboveMax: (2n ** 512n) - 1n + 1000n,
    underMin: -1n
  },
  {
    name: "int16",
    max: ((2n ** 16n) / 2n) - 1n,
    min: -((2n ** 16n) / 2n),
    value: ((2n ** 16n) / 2n) - 1n - 100n,
    aboveMax: ((2n ** 16n) / 2n) - 1n + 100n,
    underMin: -((2n ** 16n) / 2n) - 100n
  },
  {
    name: "int32",
    max: ((2n ** 32n) / 2n) - 1n,
    min: -((2n ** 32n) / 2n),
    value: ((2n ** 32n) / 2n) - 1n - 100n,
    aboveMax: ((2n ** 32n) / 2n) - 1n + 100n,
    underMin: -((2n ** 32n) / 2n) - 100n
  },
  {
    name: "int64",
    max: ((2n ** 64n) / 2n) - 1n,
    min: -((2n ** 64n) / 2n),
    value: ((2n ** 64n) / 2n) - 1n - 100n,
    aboveMax: ((2n ** 64n) / 2n) - 1n + 100n,
    underMin: -((2n ** 64n) / 2n) - 100n
  },
  {
    name: "int128",
    max: ((2n ** 128n) / 2n) - 1n,
    min: -((2n ** 128n) / 2n),
    value: ((2n ** 128n) / 2n) - 1n - 100n,
    aboveMax: ((2n ** 128n) / 2n) - 1n + 100n,
    underMin: -((2n ** 128n) / 2n) - 100n
  },
  {
    name: "int256",
    max: ((2n ** 256n) / 2n) - 1n,
    min: -((2n ** 256n) / 2n),
    value: ((2n ** 256n) / 2n) - 1n - 100n,
    aboveMax: ((2n ** 256n) / 2n) - 1n + 1n,
    underMin: -((2n ** 256n) / 2n) - 1n
  }
];

test("nums to bytes & bytes to nums", () => {
  nums.forEach((i) => {
    const num = i.value;
    const max = i.max;
    const min = i.min;
    const graph = new TransformationGraph();
    const trNum = graph.transform(num, [`${i.name}-bytes`, `bytes-${i.name}`]);
    a.equal(trNum, num, `${i.name}-bytes bytes-${i.name} links for VALUE = ${num} is not correct`);
    a.is(
      typeof trNum === "bigint", true,
      "number transformation result (value) MUST be bigint type of"
    );
    const trMax = graph.transform(max, [`${i.name}-bytes`, `bytes-${i.name}`]);
    a.equal(trMax, max, `${i.name}-bytes bytes-${i.name} links for MAX = ${max} is not correct`);
    a.is(
      typeof trMax === "bigint", true,
      "number transformation result (max) MUST be bigint type of"
    );
    const trMin = graph.transform(min, [`${i.name}-bytes`, `bytes-${i.name}`]);
    a.equal(trMin, min, `${i.name}-bytes bytes-${i.name} links for MIN = ${min} is not correct`);
    a.is(
      typeof trMin === "bigint", true,
      "number transformation result (min) MUNS be bigint type of"
    );
  });
});

test("nums to bytes above max & under min rise error", () => {
  nums.forEach((i) => {
    const aboveMax = i.aboveMax;
    const underMin = i.underMin;
    const graph = new TransformationGraph();
    a.throws(() => {
      if (i.name === "uint") throw new Error();
      graph.transform(aboveMax, [`${i.name}-bytes`]);
    }, "uint above max error not risen");
    a.throws(() => {
      graph.transform(underMin, [`${i.name}-bytes`]);
    }, "uint under min error not risen");
  });
});

test("nums to strings", () => {
  ["utf8", "ascii"].forEach((str) => {
    nums.forEach((num) => {
      const graph = new TransformationGraph();
      const strNum = graph.transform(num.value, [`${num.name}-${str}`]);
      a.is(strNum, num.value.toString(), `${num}-${str} link is uncorrected`);
    });
  });
});

test("strings to nums", () => {
  ["utf8", "ascii"].forEach((str) => {
    nums.forEach((num) => {
      const graph = new TransformationGraph();
      const trNum = graph.transform(num.value.toString(), [`${str}-${num.name}`]);
      a.is(trNum, num.value, `${str}-${num.name} link is uncorrected`);
    });
  });
});

test("boolean to nums", () => {
  nums.forEach((num) => {
    const graph = new TransformationGraph();
    const one = graph.transform(true, [`boolean-${num.name}`]);
    a.is(one, 1n, `boolean-${num.name} link is uncorrected for true`);
    const zero = graph.transform(false, [`boolean-${num.name}`]);
    a.is(zero, 0n, `boolean-${num.name} link is uncorrected for false`);
  });
});

test("nums to boolean", () => {
  nums.forEach((num) => {
    const graph = new TransformationGraph();
    const trTrue = graph.transform(1n, [`${num.name}-boolean`]);
    a.is(trTrue, true, `${num.name}-boolean is uncorrected for 1`);
    const trFalse = graph.transform(0n, [`${num.name}-boolean`]);
    a.is(trFalse, false, `${num.name}-boolean is uncorrected for 0`);
  });
});

test("strings to boolean", () => {
  ["utf8", "ascii"].forEach((name) => {
    const graph = new TransformationGraph();
    const trTrue = graph.transform("true", [`${name}-boolean`]);
    a.is(trTrue, true, `${name}-boolean link for "true" is not correct`);
    const trFalse = graph.transform("false", [`${name}-boolean`]);
    a.is(trFalse, false, `${name}-boolean link for "false" is not correct`);
    a.throws(() => {
      graph.transform("sadf", [`${name}-boolean`]);
    }, `${name}-boolean link for not "true" or "false" input MUST not be valid`);
  });
});

test("boolean to string", () => {
  ["utf8", "ascii"].forEach((name) => {
    const graph = new TransformationGraph();
    const strTrue = graph.transform(true, [`boolean-${name}`]);
    a.is(strTrue, "true", `boolean-${name} link for true is uncorrected`);
    const strFalse = graph.transform(false, [`boolean-${name}`]);
    a.is(strFalse, "false", `boolean-${name} link for false is uncorrected`);
  });
});

const FLOAT_INACCURACY = 0.000001;

test("float32 to bytes & bytes to float32", () => {
  const float = 12.13;
  const graph = new TransformationGraph();
  const trFloat = graph.transform(float, [`float32-bytes`, `bytes-float32`]);
  a.is(
    Math.abs(float - trFloat) < FLOAT_INACCURACY, true,
    "Float inaccuracy is not passed"
  );
});

test("strings to float32 & float32 to strings", () => {
  ["utf8", "ascii"].forEach((name) => {
    const strFloat = "155.1522";
    const graph = new TransformationGraph();
    const trFloat = graph.transform(strFloat, [`${name}-float32`]);
    a.is(trFloat, 155.1522, `${name}-float32 link is uncorrected`);
    const trStrFloat = graph.transform(trFloat, [`float32-${name}`]);
    a.is(trStrFloat, "155.1522", `float32-${name} is uncorrected`);
  });
});

test("extends graph", () => {
  const graph = new TransformationGraph();
  graph.extend([], [{
    name: "bytes.reverse",
    inputType: "bytes",
    outputType: "bytes",
    transform: (value: Uint8Array) => value.reverse()
  }]);
  const reversed = graph.transform(new Uint8Array([0, 1]), [`bytes.reverse`]);
  a.equal(
    reversed, new Uint8Array([1, 0]),
    `TransformationGraph.extend is uncorrected`
  );
});

test("extending existing graph or node rise error", () => {
  const graph = new TransformationGraph();
  a.throws(() => {
    graph.extend([{
      name: "bytes",
      isType: (v) => v instanceof Uint8Array
    }], []);
  }, `extending existing node MUST rise error`);
  a.throws(() => {
    graph.extend([], [{
      name: "bytes-utf8",
      inputType: "bytes",
      outputType: "utf8",
      transform: (_: any) => "test"
    }]);
  }, `extending existing link MUST rise error`);
});

const uintMap: Record<string, { max: bigint | null, numBytes: number | null, value: bigint }> = {
  uint: { max: null, numBytes: null, value: 12222282823423423438283n },
  uint16: { max: 2n ** 16n - 1n, numBytes: 2, value: 1n },
  uint32: { max: 2n ** 32n - 1n, numBytes: 4, value: 2n ** 32n - 1n - 5000n },
  uint64: { max: 2n ** 64n - 1n, numBytes: 8, value: 2n ** 64n - 1n - 10000n },
  uint128: { max: 2n ** 128n - 1n, numBytes: 16, value: 2n ** 128n - 1n - 200000n },
  uint256: { max: 2n ** 128n - 1n, numBytes: 32, value: 2n ** 256n - 1n - 2000000n }
};

test("Test uint to bytes as BE", () => {
  const graph = new TransformationGraph();
  for (const uintName in uintMap) {
    const transformed = graph.transform<Uint8Array>(259, [`${uintName}-bytes`]);
    const lastElement = transformed.length - 1;
    a.is(transformed[lastElement], 3, `${uintName}-bytes graph link result is not BE bytes`);
    a.is(transformed[lastElement - 1], 1, `${uintName}-bytes graph link result is not BE bytes`);
  }
});

test("Test uint to bytes length", () => {
  const graph = new TransformationGraph();

  for (const uintName in uintMap) {
    const uint = uintMap[uintName]!;
    const transformed = graph.transform(1, [`${uintName}-bytes`]);
    if (uint.numBytes) {
      a.is(
        transformed.length === uint.numBytes, true,
        `${uintName}-bytes graph link returns bytes length not equals to ${uint.numBytes}`
      );
    } else { // special for "uint" node
      a.is(transformed.length === 1, true,
        `${uintName}-bytes graph link must has only one element in bytes array as output`
      );
    }
  }
});

test("Uint to bytes and bytes to uint", () => {
  const graph = new TransformationGraph();
  for (const uintName in uintMap) {
    const uint = uintMap[uintName]!;
    const transformed = graph.transform(uint.value, [`${uintName}-bytes`, `bytes-${uintName}`]);
    a.is(transformed, uint.value, `uint-bytes & bytes-uint is not correct result`);
  }
});

test("Bytes from hex to number", () => {
  const graph = new TransformationGraph();
  const bytes = graph.transform<Uint8Array>("FF01", ["base16-bytes"]);
  a.equal(
    bytes,
    new Uint8Array([255, 1]),
    `Incorrect transformation base-bytes link result`
  );
  const number = graph.transform<bigint>(bytes, ["bytes-uint64"]);
  a.is(number, 65281n, "bytes-uint64 incorrect result");
});

test("compare bytes from uint and from hex", () => {
  const graph = new TransformationGraph();
  const fromHex = graph.transform("0100", ["hex-bytes"]);
  const fromUint = graph.transform(256, ["uint16-bytes"]);
  a.equal(fromHex, fromUint, "from hex and from uint bytes is not matched");
});

test("uints modular division", () => {
  const bigNumber = 2n ** 512n + 1n;
  const graph = new TransformationGraph();
  for (const uint of Object.keys(uintMap)) {
    if (uint === "uint") continue;
    const fromBigNum = graph.transform(bigNumber, [`mod.${uint}`]);
    a.is(fromBigNum, 1n, `mod.${uint} graph link invalid work with ${bigNumber}`);
    const fromLittleNum = graph.transform(10, [`mod.${uint}`]);
    a.is(fromLittleNum, 10n, `mod.${uint} graph link invalid work with ${10}`);
  }
});

test.run();
