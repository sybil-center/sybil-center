import { suite } from "uvu";
import * as a from "uvu/assert";
import { ProofService } from "../../../src/base/service/proof.service.js";
import { Credential } from "@sybil-center/sdk/types";
import { toJWTPayload } from "../../../src/util/jwt.util.js";
import sortKeys from "sort-keys";
import { createInjector, Injector } from "typed-inject";
import { Config } from "../../../src/backbone/config.js";
import { DIDService } from "../../../src/base/service/did.service.js";

const test = suite("ProofService test");

const PATH_TO_CONFIG = new URL("../test.env", import.meta.url);
let injector: Injector<{ didService: DIDService; proofService: ProofService }>;

test.before.each(async () => {
  injector = createInjector()
    .provideValue("config", new Config(PATH_TO_CONFIG))
    .provideClass("didService", DIDService)
    .provideClass("proofService", ProofService);
  await injector.resolve("didService").init();

  vc = {
    type: ["VerifiableCredential", "Empty"],
    issuer: { id: "issuer" },
    "@context": ["test"],
    id: "testId",
    issuanceDate: new Date(),
    credentialSubject: {
      id: "testSubjectId"
    },
  };
});

let vc: Credential | null = null;

test("should correct sign JWS", async () => {
  const proofService = injector.resolve("proofService");
  const didService = injector.resolve("didService");
  const { proof } = await proofService.jwsSing(vc!);
  a.ok(proof, "proof is undefined after signing by ProofService");
  a.ok(
    proof.jws,
    "proof.jws property is undefined after signing by ProofService"
  );
  a.type(proof.jws, "string", 'proof.jws should be "string" type');
  a.is(proof.proofPurpose, "assertionMethod");
  a.is(
    proof.verificationMethod,
    didService.verificationMethod,
    `proof.verification method have to be ${didService.verificationMethod}`
  );
});

test("should verify JWS", async () => {
  const proofService = injector.resolve("proofService");
  const { proof } = await proofService.jwsSing(vc!);
  const jws = proof!.jws!;

  vc!.proof = undefined;

  const [jwsHeader, _, jwsVerifySignature] = jws.split(".");
  const jwsPayload = toJWTPayload(sortKeys(vc!));

  const fullJws = `${jwsHeader}.${jwsPayload}.${jwsVerifySignature}`;

  await injector.resolve("didService").verifyJWS(fullJws);
});

test.run();
