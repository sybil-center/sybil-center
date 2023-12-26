import {
  CRED_TYPES,
  CredType,
  ID_TYPES,
  IdType,
  MINA_CHAINIDS,
  MinaChainId,
  SIGNATURE_PROOFS,
  SignProofType,
  ZIdentifier
} from "../types/index.js";
import { zcred } from "zcred-core";

function isIdType(id: string): id is IdType {
  return ID_TYPES
    // @ts-ignore
    .includes(id);
}

function isSignProofType(proofType: string): proofType is SignProofType {
  return SIGNATURE_PROOFS
    // @ts-ignore
    .includes(proofType);
}

function isCredType(credType: string): credType is CredType {
  return CRED_TYPES
    // @ts-ignore
    .includes(credType);
}

function normalizeId(id: ZIdentifier): ZIdentifier {
  if (id.type === "ethereum:address") {
    let key = id.key.toLowerCase();
    key = key.startsWith("0x") ? key : `0x${key}`;
    return { type: id.type, key: key };
  }
  return id;
}

function isMinaChainId(chainId: string): chainId is MinaChainId {
  return MINA_CHAINIDS
    // @ts-expect-error
    .includes(chainId);
}

export const zcredjs = {
  isIdType,
  isSignProofType,
  isCredType,
  normalizeId,
  issuerPath(credType: CredType) {
    const basePath = `/api/v1/zcred/issuers/${credType}`;
    return new (class PathProvider {
      get challenge() { return `${basePath}/challenge`;}
      get canIssue() { return `${basePath}/can-issue`; }
      get issue() { return `${basePath}/issue`; }
      endpoint(domain: string) {return new URL(basePath, domain);}
    })();
  },
  isMinaChainId,
  ...zcred
};