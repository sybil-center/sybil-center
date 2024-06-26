import { IZcredResultHandler, OnExceptionResult, OnSuccessResult } from "../../types/verifiers.type.js";
import { getHtmlURL, SessionData } from "../../controllers/verifier.controller.js";
import { Config } from "../../backbone/config.js";
import { tokens } from "typed-inject";
import { Identifier, isStrictId, StrictId, VEC } from "@zcredjs/core";
import { VerifierException } from "../../backbone/exception.js";
import { EthSybilStore } from "../../stores/eth-sybil.store.js";
import secp256k1 from "secp256k1";
import { getBytes, hexlify, keccak256 } from "ethers";
import * as u8a from "uint8arrays";

type PublicInput = {
  context: {
    now: string;
  },
  credential: {
    attributes: {
      subject: {
        id: StrictId;
      },
      document: {
        sybilId: string;
      }
    }
  }
}

function isPublicInput(input: unknown): input is PublicInput {
  return (
    typeof input === "object" && input !== null &&
    "context" in input && typeof input.context === "object" && input.context !== null &&
    "now" in input.context && typeof input.context.now === "string" &&
    "credential" in input && typeof input.credential === "object" && input.credential !== null &&
    "attributes" in input.credential && typeof input.credential.attributes === "object" && input.credential.attributes !== null &&
    "subject" in input.credential.attributes &&
    typeof input.credential.attributes.subject === "object" &&
    input.credential.attributes.subject !== null &&
    "id" in input.credential.attributes.subject &&
    isStrictId(input.credential.attributes.subject.id) &&
    "document" in input.credential.attributes &&
    typeof input.credential.attributes.document === "object" &&
    input.credential.attributes.document !== null &&
    "sybilId" in input.credential.attributes.document &&
    typeof input.credential.attributes.document.sybilId === "string"
  );
}

export class ZcredResultHandler implements IZcredResultHandler {

  static inject = tokens(
    "config",
    "ethSybilStore",
    "clientService"
  );
  constructor(
    private readonly config: Config,
    private readonly ethSybilStore: EthSybilStore,
  ) {}

  async onException(_: OnExceptionResult): Promise<URL | void> {
    return getHtmlURL(this.config.exposeDomain, ["verification", "fail.html"]);
  }

  async onSuccess({
    provingResult,
    subjectId,
    session
  }: OnSuccessResult<SessionData>): Promise<URL> {
    const publicInput = provingResult.publicInput;
    if (!isPublicInput(publicInput)) throw new VerifierException({
      code: VEC.VERIFY_NOT_PASSED,
      msg: "Unexpected zk-proof public input"
    });
    const {
      context,
      credential: {
        attributes: {
          subject,
          document: {
            sybilId
          }
        }
      }
    } = publicInput;
    this.checkContextDate(context.now);
    const redirect = session.body.redirectURL;
    if (!redirect) throw new VerifierException({
      code: VEC.VERIFY_BAD_REQ,
      msg: "Redirect URL is undefined"
    });
    const redirectURL = new URL(redirect);
    if (!isEqualsIds(subjectId, subject.id)) {
      throw new VerifierException({
        code: VEC.VERIFY_NOT_PASSED,
        msg: `Subject identifier from public input not matched`
      });
    }
    const address = getBytes(subject.id.key);
    const hashInput = Uint8Array.from([
      ...address, ...u8a.fromString(sybilId, "base58btc")
    ]);

    const signature = createSecp256k1Signature(
      getBytes(keccak256(hashInput)),
      getBytes(this.config.ethSybilContractOwnerPrivateKey)
    );
    try {
      const found = await this.ethSybilStore.getByAddress(subjectId.key.toLowerCase());
      if (!found) {
        await this.ethSybilStore.save({
          sybilId: hexlify(u8a.fromString(sybilId, "base58btc")),
          address: hexlify(address).toLowerCase(),
          signature
        });
      }
      return new URL(redirectURL);
    } catch (e: any) {
      throw new VerifierException({
        code: VEC.VERIFIER_ERROR,
        msg: "Verifier unexpected error",
        desc: e.message
      });
    }
  }

  private checkContextDate(date: string): void {
    const delta = 360 * 1000;
    if (new Date(date).getTime() > (new Date().getTime() + delta)) {
      throw new VerifierException({
        code: VEC.VERIFY_NOT_PASSED,
        msg: `public input context "now" is bigger than current time`
      });
    }
  }

}

function isEqualsIds(fst: Identifier, snd: Identifier) {
  return (fst.type === snd.type && fst.key === snd.key);
}

function createSecp256k1Signature(msg: Uint8Array, privateKey: Uint8Array): string {
  const { signature, recid } = secp256k1.ecdsaSign(msg, privateKey);
  const v = recid === 0 ? 27 : 28;
  return hexlify(Uint8Array.from([...signature, v]));
}