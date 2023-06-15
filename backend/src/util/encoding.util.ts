import * as u8a from "uint8arrays";

class FromStr {
  constructor(readonly value: Uint8Array) {}

  to(enc: u8a.SupportedEncodings): string {
    return u8a.toString(this.value, enc);
  }
}

export const encode = {
  from: (str: string, enc?: u8a.SupportedEncodings): FromStr => {
    const value = u8a.fromString(str, enc);
    return new FromStr(value);
  }
};
