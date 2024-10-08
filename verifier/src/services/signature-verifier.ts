import { verifyMessage } from "ethers";
import Client from "mina-signer";
import { Signature } from "o1js";
import { IdType, zcredjs } from "@zcredjs/core";
import * as u8a from "uint8arrays";

type Entry = {
  signature: string;
  message: string;
  publicKey: string;
}

const verifiers: Record<IdType, (args: Entry) => Promise<boolean>> = {
  "mina:publickey": verifyMinaSignature,
  "ethereum:address": verifyEthSignature
};

export async function verifySignature(args: {
  message: string;
  signature: string;
  subject: {
    id: { type: string, key: string }
  }
}): Promise<boolean> {
  const idtype = args.subject.id.type;
  if (!zcredjs.isIdType(idtype)) throw new Error(
    `Subject id type is not valid. Current id type is ${idtype}`
  );
  return await verifiers[idtype]({
    ...args,
    publicKey: args.subject.id.key
  });
}

async function verifyEthSignature({
  signature,
  message,
  publicKey
}: Entry): Promise<boolean> {
  try {
    const hexSignature = u8a.toString(u8a.fromString(signature, "base58btc"), "hex");
    const actualAddress = verifyMessage(message, `0x${hexSignature}`);
    return actualAddress.toLowerCase() === (publicKey.startsWith("0x")
        ? publicKey.toLowerCase()
        : `0x${publicKey.toLowerCase()}`
    );
  } catch (e) {
    return false;
  }
}

async function verifyMinaSignature({
  signature,
  message,
  publicKey
}: Entry): Promise<boolean> {
  const minaClient = new Client({ network: "mainnet" });
  const { r: field, s: scalar } = Signature.fromBase58(signature).toJSON();
  return minaClient.verifyMessage({
    signature: { field, scalar },
    publicKey: publicKey,
    data: message
  });
}