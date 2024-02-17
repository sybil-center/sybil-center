import { suite } from "uvu";
import * as a from "uvu/assert";
import { MinaPoseidonPastaSignatureProver } from "../../../../src/services/credential-provers/mina-poseidon-pasta.js";
import * as o1js from "o1js";
import { Field, Poseidon, PrivateKey, Signature } from "o1js";
import { O1GraphLink, O1TrGraph, TrSchema } from "o1js-trgraph";
import sortKeys from "sort-keys";


const test = suite("Mina poseidon-pasta signer");

test("signing attributes", async () => {
  const privateKey = PrivateKey.random();
  const subjectAddress = PrivateKey.random().toPublicKey().toBase58();
  const attributes = {
    type: "passport",
    issuanceDate: new Date().toISOString(),
    validFrom: new Date().toISOString(),
    validUntil: new Date().toISOString(),
    subject: {
      id: {
        type: "mina:publickey",
        key: subjectAddress
      },
      name: "John"
    }
  } as const;
  const attributeSchema: TrSchema<O1GraphLink> = {
    type: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"],
    issuanceDate: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
    validFrom: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
    validUntil: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
    subject: {
      id: {
        type: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"],
        key: ["base58-mina:publickey", "mina:publickey-mina:fields"]
      },
      name: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"]
    }
  };
  const tg = new O1TrGraph(o1js);
  const { linear } = tg.objectTransform<{}, Field[]>(
    attributes,
    sortKeys(attributeSchema, { deep: true })
  );
  const hash = Poseidon.hash(linear);
  const signature = Signature.create(privateKey, [hash]);
  const signer = new MinaPoseidonPastaSignatureProver({ minaPrivateKey: privateKey.toBase58() });
  const proof = await signer.signAttributes(attributes, attributeSchema);
  a.is(proof.signature, signature.toBase58(), "signature is not matched");
  a.equal(proof.issuer.id, {
    type: "mina:publickey",
    key: privateKey.toPublicKey().toBase58()
  });
  a.equal(proof.schema.attributes, attributeSchema);
});

test.run();
