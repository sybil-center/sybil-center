import { suite } from "uvu";
import * as a from "uvu/assert";
import * as o1js from "o1js";
import vm from "node:vm";
import { App } from "../../../../../src/app.js";
import { FastifyInstance } from "fastify";
import dotenv from "dotenv";
import { PATH_TO_CONFIG } from "../../../../test-util/index.js";
import { Proposal, ProvingResult } from "../../../../../src/types/index.js";
import { ProgramInitResult } from "../../../../../src/services/o1js-proof-verifier.js";
import { ZkProgramInputTransformer, ZkProgramTranslator } from "@jaljs/o1js";
import Client from "mina-signer";
import { InputTransformer } from "@jaljs/core";
import { O1TrGraph } from "o1js-trgraph";
import { SEC } from "@zcredjs/core";
import { Config } from "../../../../../src/backbone/config.js";

const test = suite("o1js-mina-passport verifier test");

const verifierId = "o1js-mina-passport";
const trgraph = new O1TrGraph(o1js);

let app: App;
let fastify: FastifyInstance;
let config: Config;

test.before(async () => {
  dotenv.config({ path: PATH_TO_CONFIG, override: true });
  app = await App.init();
  fastify = app.context.resolve("httpServer").fastify;
  config = app.context.resolve("config");
});

test.after(async () => {
  await app.close();
});


test("Success flow", async () => {
  const privateKey = o1js.PrivateKey.fromBase58("EKE8VhKY6wGgeWS7fpPhzQDsf9yjkiHfnzM3AEeCH5wc2pxqGsHF");
  const publicKey = privateKey.toPublicKey();
  // Get proposal
  const proposalResp = await fastify.inject({
    method: "GET",
    url: `/api/zcred/proposal/${verifierId}`,
    query: {
      "subject.id.type": "mina:publickey",
      "subject.id.key": publicKey.toBase58(),
      "verifier-id": "mina-passport"
    }
  });
  a.is(
    proposalResp.statusCode, 200,
    `Proposal resp status code is not 200. Resp body: ${proposalResp.body}`
  );
  const proposal: Proposal = JSON.parse(proposalResp.body);
  // Calculate proof
  const translator = new ZkProgramTranslator(o1js, "commonjs");
  const programCode = translator.translate(proposal.program);
  const module = new vm.Script(programCode).runInThisContext();
  const { zkProgram, PublicInput } = (await module.initialize(o1js) as ProgramInitResult);
  const { verificationKey } = await zkProgram.compile();

  const setup = {
    private: {
      credential: credentialMinaPK
    },
    public: {
      context: {
        now: new Date().toISOString()
      }
    }
  };

  const transformedInput = new ZkProgramInputTransformer(o1js).transform(
    setup,
    proposal.program.inputSchema
  );
  const jsonProof = await zkProgram.execute(
    new PublicInput(transformedInput.public),
    ...transformedInput.private
  ).then((proof) => proof.toJSON());
  a.is(
    await o1js.verify(jsonProof, verificationKey.data), true,
    `Proof is not verified`
  );

  // Sign message
  const signer = new Client({ network: "mainnet" });
  const {
    signature: {
      field,
      scalar
    }
  } = signer.signMessage(proposal.challenge.message, privateKey.toBase58());
  const signature = o1js.Signature.fromObject({
    r: o1js.Field.fromJSON(field),
    s: o1js.Scalar.fromJSON(scalar)
  }).toBase58();

  // Build proving result
  const originInput = new InputTransformer(
    proposal.program.inputSchema,
    trgraph
  ).toInput(setup);

  const provingResult: ProvingResult = {
    signature: signature,
    proof: jsonProof.proof,
    publicInput: originInput["public"],
    verificationKey: verificationKey.data
  };

  // Send proving result

  const verifierURL = new URL(proposal.verifierURL);
  const injectVerifierURL = verifierURL.pathname + verifierURL.search;

  const authResp = await fastify.inject({
    method: "POST",
    url: injectVerifierURL,
    body: provingResult
  });

  a.is(authResp.statusCode, 200, `Auth response status code is not 200. Resp body: ${authResp.body}`);
  const authResult: { redirectURL: string } = JSON.parse(authResp.body);
  a.ok(authResult.redirectURL, `"redirect url is undefined"`);
  a.type(authResult.redirectURL, "string", `"redirect url is not string"`);
});

const credentialMinaPK = {
  "meta": {
    "issuer": {
      "type": "http",
      "uri": "http://localhost:8080/issuers/passport"
    },
    "definitions": {
      "attributes": {
        "type": "document type (passport)",
        "validFrom": "passport valid from date",
        "issuanceDate": "passport issuance date",
        "validUntil": "passport valid until",
        "subject": {
          "id": {
            "type": "passport owner public key type",
            "key": "passport owner public key"
          },
          "firstName": "passport owner first name",
          "lastName": "passport owner last name",
          "birthDate": "passport owner birth date",
          "gender": "passport owner gender"
        },
        "countryCode": "passport country code",
        "document": {
          "id": "passport id (should be private)",
          "sybilId": "document unique public id"
        }
      }
    }
  },
  "attributes": {
    "type": "passport",
    "issuanceDate": "2024-06-19T10:05:42.883Z",
    "validFrom": "2014-12-31T21:00:00.000Z",
    "validUntil": "2029-12-31T21:00:00.000Z",
    "subject": {
      "id": {
        "type": "mina:publickey",
        "key": "B62qqXhJ8qgXdApGoAvZHeXrHEg6YGqmThFcRN8xKqAvJsqjmUMVaZE"
      },
      "firstName": "John",
      "lastName": "Smith",
      "birthDate": "1994-12-31T21:00:00.000Z",
      "gender": "male"
    },
    "countryCode": "GBR",
    "document": {
      "id": "test-passport:123456",
      "sybilId": "2kb3KNqgsw3h5SaN79u1jURErzP8"
    }
  },
  "proofs": {
    "mina:poseidon-pasta": {
      "mina:publickey:B62qmNen3kDN74CJ2NQteNABrEN4AurGTbsLrraPy6ipQgUV9Q73tv2": {
        "type": "mina:poseidon-pasta",
        "issuer": {
          "id": {
            "type": "mina:publickey",
            "key": "B62qmNen3kDN74CJ2NQteNABrEN4AurGTbsLrraPy6ipQgUV9Q73tv2"
          }
        },
        "signature": "7mXUwaNCuqq2uTNJ8Gq41sDc7sKdtQe69Y5hJgsjuYdcUE5kZ6cXM7MtthsZUrL2G96vDWFeyjXTaZmhYztb6U8SLBxSUfob",
        "schema": {
          "attributes": {
            "countryCode": [
              "iso3166alpha3-iso3166numeric",
              "iso3166numeric-uint16",
              "uint16-mina:field"
            ],
            "document": {
              "id": [
                "utf8-bytes",
                "bytes-uint",
                "mina:mod.order",
                "uint-mina:field"
              ],
              "sybilId": [
                "base58-bytes",
                "bytes-uint",
                "mina:mod.order",
                "uint-mina:field"
              ]
            },
            "issuanceDate": [
              "isodate-bytesdate",
              "bytesdate-unixtime19",
              "unixtime19-uint64",
              "uint64-mina:field"
            ],
            "subject": {
              "birthDate": [
                "isodate-bytesdate",
                "bytesdate-unixtime19",
                "unixtime19-uint64",
                "uint64-mina:field"
              ],
              "firstName": [
                "utf8-bytes",
                "bytes-uint",
                "mina:mod.order",
                "uint-mina:field"
              ],
              "gender": [
                "ascii-bytes",
                "bytes-uint64",
                "uint64-mina:field"
              ],
              "id": {
                "key": [
                  "base58-mina:publickey",
                  "mina:publickey-mina:fields"
                ],
                "type": [
                  "ascii-bytes",
                  "bytes-uint128",
                  "uint128-mina:field"
                ]
              },
              "lastName": [
                "utf8-bytes",
                "bytes-uint",
                "mina:mod.order",
                "uint-mina:field"
              ]
            },
            "type": [
              "ascii-bytes",
              "bytes-uint128",
              "uint128-mina:field"
            ],
            "validFrom": [
              "isodate-bytesdate",
              "bytesdate-unixtime19",
              "unixtime19-uint64",
              "uint64-mina:field"
            ],
            "validUntil": [
              "isodate-bytesdate",
              "bytesdate-unixtime19",
              "unixtime19-uint64",
              "uint64-mina:field"
            ]
          },
          "type": [
            "ascii-bytes",
            "bytes-uint",
            "mina:mod.order",
            "uint-mina:field"
          ],
          "signature": [
            "base58-mina:signature"
          ],
          "issuer": {
            "id": {
              "type": [
                "ascii-bytes",
                "bytes-uint",
                "mina:mod.order",
                "uint-mina:field"
              ],
              "key": [
                "base58-mina:publickey"
              ]
            }
          }
        }
      }
    }
  },
  "protection": {
    "jws": "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDprZXk6ejZNa21TWkd5aE1rTkhIR0NnUVJKYVN2NXlRbjVqMjgzZEZ0clpHNnp1QmpNREttI3o2TWttU1pHeWhNa05ISEdDZ1FSSmFTdjV5UW41ajI4M2RGdHJaRzZ6dUJqTURLbSJ9..-N0mhtX-1CiB4UzRLKJD1BhWtaCULgsAzAdTY0qtx_-RYthGL_mACruipIlZeTmAD9RyQW5A7fwGmyXTdQ6nCw"
  }
};

test("reject authentication", async () => {
  const privateKey = o1js.PrivateKey.fromBase58("EKE8VhKY6wGgeWS7fpPhzQDsf9yjkiHfnzM3AEeCH5wc2pxqGsHF");
  const publicKey = privateKey.toPublicKey();
  const proposalResp = await fastify.inject({
    method: "GET",
    url: `/api/zcred/proposal/${verifierId}`,
    query: {
      "subject.id.type": "mina:publickey",
      "subject.id.key": publicKey.toBase58(),
      "verifier-id": "mina-passport"
    }
  });
  a.is(
    proposalResp.statusCode, 200,
    `Proposal response status code is not 200, body: ${proposalResp.body}`
  );
  const proposal: Proposal = JSON.parse(proposalResp.body);
  const verifierURL = new URL(proposal.verifierURL);
  const injectVerifierURL = verifierURL.pathname + verifierURL.search;
  const authResp = await fastify.inject({
    method: "POST",
    url: injectVerifierURL,
    body: {
      code: SEC.REJECT
    }
  });
  a.is(
    authResp.statusCode, 200,
    `Reject authentication response status code is not 200, body: ${authResp.body}`
  );
  const { redirectURL } = JSON.parse(authResp.body) as { redirectURL: string };
  a.is(
    redirectURL, new URL("./public/html/verification/fail.html", config.exposeDomain).href,
    "Invalid redirect url after reject"
  );
});

test.run();