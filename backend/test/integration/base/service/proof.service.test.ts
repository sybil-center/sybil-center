import { suite } from "uvu";
import * as a from "uvu/assert";
import { ProofService } from "../../../../src/base/service/proof.service.js";
import { Credential } from "@sybil-center/sdk/types";
import sortKeys from "sort-keys";
import { createInjector, Injector } from "typed-inject";
import { Config } from "../../../../src/backbone/config.js";
import { DIDService } from "../../../../src/base/service/did.service.js";

const test = suite("INTEGRATION: proofService test");

const PATH_TO_CONFIG = new URL("../../../env-config/test.env", import.meta.url);
let injector: Injector<{ didService: DIDService; proofService: ProofService }>;

test.before(async () => {
  injector = createInjector()
    .provideValue("config", new Config(PATH_TO_CONFIG))
    .provideClass("didService", DIDService)
    .provideClass("proofService", ProofService);
  await injector.resolve("didService").init();
});

test.after(async () => {
  await injector.dispose();
})

test.before.each(async () => {
  const issuerDID = injector.resolve("didService").id;
  //@ts-ignore
  vc = sortKeys(
    {
      type: ["VerifiableCredential", "Empty"],
      issuer: { id: issuerDID },
      "@context": ["test"],
      id: "testId",
      issuanceDate: new Date(),
      credentialSubject: {
        id: "testSubjectId"
      },
    },
    { deep: true }
  );
});

let vc: Credential | null = null;

test("should correct sign JWS", async () => {
  const proofService = injector.resolve("proofService");
  const didService = injector.resolve("didService");
  const { proof } = await proofService.sign("JsonWebSignature2020", vc!);
  a.ok(proof, "proof is undefined after signing by ProofService");
  a.ok(
    proof.jws,
    "proof.jws property is undefined after signing by ProofService"
  );
  a.type(proof.jws, "string", "proof.jws should be \"string\" type");
  a.is(proof.proofPurpose, "assertionMethod");
  a.is(
    proof.verificationMethod,
    didService.verificationMethod,
    `proof.verification method have to be ${didService.verificationMethod}`
  );
});

test("should verify credential with jws proof", async () => {
  const proofService = injector.resolve("proofService");
  const credential = await proofService.sign("JsonWebSignature2020", vc!);
  const isVerified = await proofService.verify(credential);
  a.is(isVerified, true, "proof is not verified");
});

test.run();
