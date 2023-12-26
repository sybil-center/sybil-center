import { suite } from "uvu";
import { O1GraphLink, O1TrGraph } from "o1js-trgraph";
import { ACIMinaPoseidonProver } from "../../../../src/services/credential-prover/aci-mina-poseidon.js";
import { Field, Poseidon, PrivateKey } from "o1js";
import { TrSchema } from "@zcredjs/core";
import sortKeys from "sort-keys";
import * as a from "uvu/assert";

const test = suite("ACI Mina Poseidon prover");

type Transformed = {
  type: Field,
  validFrom: Field,
  validUntil: Field,
  subject: {
    name: Field,
    birthDate: Field
  }
}

test("create proof", async () => {
  const prover = new ACIMinaPoseidonProver();
  const privateKey = PrivateKey.random();
  const publicKey = privateKey.toPublicKey().toBase58();
  const trGraph = new O1TrGraph();
  const attributes = {
    type: "passport",
    issuanceDate: new Date().toISOString(),
    validFrom: new Date().toISOString(),
    validUntil: new Date().toISOString(),
    subject: {
      id: {
        type: "mina:publickey",
        key: publicKey
      },
      name: "John",
      birthDate: new Date().toISOString()
    }
  } as const;
  const schema: TrSchema<O1GraphLink> = sortKeys({
    type: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"],
    validFrom: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
    validUntil: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
    subject: {
      name: ["utf8-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"],
      birthDate: ["isodate-unixtime19", "unixtime19-uint64", "uint64-mina:field"]
    }
  }, { deep: true });
  const { linear } = trGraph
    .objectTransform<Transformed, Field[]>(attributes, schema);
  const aciField = Poseidon.hash(linear);
  const aci = trGraph.transform<string>(aciField.toBigInt(), ["uint256-bytes", "bytes-base58"]);
  const proof = await prover.createProof(attributes, schema);
  a.is(proof.aci, aci);
  a.instance(trGraph.transform(proof.aci, proof.schema.aci), Field);
  a.equal(trGraph.transform(proof.aci, proof.schema.aci), aciField);
});

test.run();
