import { Proved, ZkcProof, ZkCred } from "@sybil-center/zkc-core";
import { o1jsPreparator } from "./preparator.js";
import { Field, Poseidon, PublicKey, Signature } from "o1js";

type Options = {
  id?: string; // more important than "position"
  position?: number;
}

export async function verifyCred<
  T extends ZkCred = ZkCred
>(
  cred: Proved<T>,
  options?: Options
): Promise<boolean> {
  const copy = JSON.parse(JSON.stringify(cred)) as Proved<ZkCred>;
  const proofList = copy.proof;
  // @ts-ignore
  copy.proof = undefined;
  if (!proofList) throw new Error("Zero-Knowledge Credential without proof");
  const proof = findProof(proofList, options);
  const prepared = o1jsPreparator.prepare<Field[]>(copy, proof.transformSchema);
  const hash = Poseidon.hash(prepared);
  const signature = Signature.fromBase58(proof.sign);
  return signature.verify(
    PublicKey.fromBase58(proof.key),
    [hash]
  ).toBoolean();
}

function findProof(proofs: ZkcProof[], options?: Options): ZkcProof {
  if (options?.id) {
    const proof = findById(proofs, options.id);
    if (proof) return proof;
    throw new Error(`ZK Credential Proof with id ${options.id} not found`);
  } else if (options?.position) {
    const proof = findByPosition(proofs, options.position);
    if (proof) return proof;
    throw new Error(`ZK Credential Proof with position ${options.position} not found`);
  } else {
    const proof = proofs[0];
    if (proof) return proof;
    throw new Error(`ZK Credential haven't any proof`);
  }
}

function findById(proofs: ZkcProof[], id: string): ZkcProof | undefined {
  return proofs.find(({ id: proofId }) => proofId === id);
}

function findByPosition(proofs: ZkcProof[], position: number): ZkcProof | undefined {
  return proofs[position];
}


