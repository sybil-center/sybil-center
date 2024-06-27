import { JalProgram } from "@jaljs/core";

export type Selector = {
  meta: {
    issuer: {
      type: string;
      uri: string;
    }
  },
  attributes: {
    subject: {
      id: {
        type: string;
        key: string;
      }
    }
  }
}


export type Proposal = {
  verifierURL: string;
  program: JalProgram;
  challenge: {
    message: string;
  }
  selector: Selector;
  verificationKey?: string;
  provingKey?: string;
  accessToken?: string;
  comment?: string;
}

type Json = string | boolean | number | { [key: string]: Json }

export type ProvingResult = {
  signature: string;
  proof: string;
  publicInput?: Record<string, Json>
  publicOutput?: Record<string, Json>
  verificationKey?: string;
  provingKey?: string;
}

export function isProvingResult(o: unknown): o is ProvingResult {
  return (
    typeof o === "object" && o !== null &&
    "signature" in o && typeof o.signature === "string" &&
    "proof" in o && typeof o.proof === "string" && (
      !("publicInput" in o) || ("publicInput" in o && (
        typeof o.publicInput === "undefined" ||
        typeof o.publicInput === "object" ||
        o.publicInput === null
      ))
    ) && (
      !("publicOutput" in o) || ("publicOutput" in o && (
        typeof o.publicOutput === "object" ||
        typeof o.publicOutput === "undefined" ||
        o.publicOutput === null
      ))
    ) && (
      !("verificationKey" in o) || ("verificationKey" in o && (
        typeof o.verificationKey === "undefined" ||
        typeof o.verificationKey === "string" ||
        o.verificationKey === null
      ))
    ) && (
      !("provingKey" in o) || ("provingKey" in o && (
        typeof o.provingKey === "undefined" ||
        typeof o.provingKey === "string" ||
        o.provingKey === null
      ))
    )
  );
}

export type JalTarget = "o1js:zk-program.cjs"