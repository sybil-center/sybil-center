import { JalProgram } from "@jaljs/core";
import { ProvingResultDto } from "../models/dtos/proving-result.dto.js";

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
    exceptionDifficulty?: number; // 5 by default
  }
  selector: Selector;
  verificationKey?: string;
  provingKey?: string;
  accessToken?: string;
  comment?: string;
}

export type ProvingResult = Pick<
  ProvingResultDto,
  "signature" |
  "message" |
  "proof" |
  "verificationKey" |
  "provingKey" |
  "publicInput" |
  "publicOutput"
>

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