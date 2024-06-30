import { IZcredResultHandler, OnExceptionResult, OnSuccessResult } from "../../types/verifiers.type.js";
import { getHtmlURL } from "../../controllers/verifier.controller.js";
import { Config } from "../../backbone/config.js";
import { tokens } from "typed-inject";
import { Identifier, isStrictId, StrictId, VEC } from "@zcredjs/core";
import { VerifierException } from "../../backbone/exception.js";

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

  static inject = tokens("config");
  constructor(private readonly config: Config) {}

  async onException(_: OnExceptionResult): Promise<URL> {
    return getHtmlURL(this.config.exposeDomain, ["verification", "fail.html"]);
  }

  async onSuccess({
    provingResult,
    subjectId
  }: OnSuccessResult): Promise<URL> {
    const publicInput = provingResult.publicInput;
    if (!isPublicInput(publicInput)) throw new VerifierException({
      code: VEC.VERIFY_NOT_PASSED,
      msg: "Unexpected zk-proof public input"
    });
    const {
      context,
      credential: {
        attributes: { subject }
      }
    } = publicInput;
    this.checkContextDate(context.now);
    if (!isEqualsIds(subjectId, subject.id)) {
      throw new VerifierException({
        code: VEC.VERIFY_NOT_PASSED,
        msg: `Subject identifier from public input not matched`
      });
    }
    return getHtmlURL(this.config.exposeDomain, ["verification", "done.html"]);
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