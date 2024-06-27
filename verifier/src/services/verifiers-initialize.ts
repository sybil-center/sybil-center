import { ROOT_DIR } from "../util/index.js";
import fs from "node:fs";
import { ProposerModule, ZcredResultHandlerModule } from "../types/verifiers.type.js";
import { IZkProofVerifier } from "../types/zk-proof-verifier.js";
import { O1JSProofVerifier } from "./o1js-proof-verifier.js";
import { JalProgram } from "@jaljs/core";
import crypto from "node:crypto";

export const VERIFIERS_DIR = new URL(`./verifiers/`, ROOT_DIR);

const verifiersIds: string[] = [];

export function getVerifiersIds(): string[] {
  if (verifiersIds.length === 0) {
    fs.readdirSync(VERIFIERS_DIR, { withFileTypes: true })
      .filter((it) => it.isDirectory())
      .map((it) => it.name)
      .filter((it) => !["types", "util"].includes(it))
      .forEach((id) => verifiersIds.push(id));
    return verifiersIds;
  }
  return verifiersIds;
}

const zkProofVerifierCache = new Map<string, Promise<IZkProofVerifier>>([]);

export async function createZkProofVerifier(jalProgram: JalProgram): Promise<IZkProofVerifier> {
  const hash = crypto.createHash("sha256")
    .update(JSON.stringify(jalProgram))
    .digest("base64");
  const cachedVerifier = zkProofVerifierCache.get(hash);
  if (cachedVerifier) return cachedVerifier;
  if (jalProgram.target === "o1js:zk-program.cjs") {
    const verifierPromise = O1JSProofVerifier.init(jalProgram);
    zkProofVerifierCache.set(hash, verifierPromise);
    return verifierPromise;
  } else {
    throw new Error(`Jal program with target "${jalProgram.target}" not supported`);
  }
}

const zkResultHandlerConstructorMap = new Map<
  string,
  ZcredResultHandlerModule["ZcredResultHandler"]
>([]);

export async function getZkResultHandlerConstructors() {
  if (zkResultHandlerConstructorMap.size === 0) {
    for (const id of getVerifiersIds()) {
      let path = new URL(`./${id}/zcred-result-handler.js`, VERIFIERS_DIR);
      if (!fs.existsSync(path)) {
        path = new URL(`./${id}/zcred-result-handler.ts`, VERIFIERS_DIR);
      }
      if (fs.existsSync(path)) {
        try {
          const { ZcredResultHandler }: ZcredResultHandlerModule = await import(path.href);
          zkResultHandlerConstructorMap.set(id, ZcredResultHandler);
        } catch (e) {
          throw new Error(`Zcred result handler not initialized by path: ${path.href}`);
        }
      } else {
        throw new Error(`Can not find zcred result handler with id: ${id}`);
      }
    }
  }
  return zkResultHandlerConstructorMap;
}

const proposerConstructors = new Map<
  string,
  ProposerModule["Proposer"]>(
  []
);

export async function getProposerConstructors() {
  if (proposerConstructors.size === 0) {
    for (const id of getVerifiersIds()) {
      let path = new URL(`./${id}/proposer.js`, VERIFIERS_DIR);
      if (!fs.existsSync(path)) {
        path = new URL(`./${id}/proposer.ts`, VERIFIERS_DIR);
      }
      if (fs.existsSync(path)) {
        try {
          const {
            Proposer
          }: ProposerModule = await import(path.href);
          proposerConstructors.set(id, Proposer);
        } catch (e) {
          throw new Error(`Proposer not initialized by path: ${path.href}`);
        }
      } else {
        throw new Error(`Can not find proposer with id: ${id}`);
      }
    }
  }
  return proposerConstructors;
}

export function toProposerToken(id: string) {
  return `${id}/proposer`;
}

export function toResultHandlerToken(id: string) {
  return `${id}/zcred-result-handler`;
}

