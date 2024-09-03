import * as a from "uvu/assert";
import { suite } from "uvu";
import { App } from "../../../../../src/app.js";
import { FastifyInstance } from "fastify";
import dotenv from "dotenv";
import { PATH_TO_CONFIG } from "../../../../test-util/index.js";
import { Proposal, ProvingResult } from "../../../../../src/types/index.js";
import { ProgramInitResult } from "../../../../../src/services/o1js-proof-verifier.js";
import { ethers, getBytes, hexlify, keccak256 } from "ethers";
import { ZkProgramInputTransformer, ZkProgramTranslator } from "@jaljs/o1js";
import vm from "node:vm";
import * as o1js from "o1js";
import { InputTransformer } from "@jaljs/core";
import { O1TrGraph } from "o1js-trgraph";
import crypto from "node:crypto";
import * as u8a from "uint8arrays";
import { Config } from "../../../../../src/backbone/config.js";
import { EthSybilEntity } from "../../../../../src/models/entities/eth-sybil.entity.js";
import secp256k1 from "secp256k1";
import { DbClient } from "../../../../../src/backbone/db-client.js";

const test = suite("o1js-ethereum-passport verifier test");

const trgraph = new O1TrGraph(o1js);
const verifierId = "o1js-ethereum-passport";

let app: App;
let fastify: FastifyInstance;
let config: Config;
let db: DbClient["db"];

test.before(async () => {
  dotenv.config({ path: PATH_TO_CONFIG, override: true });
  app = await App.init();
  fastify = app.context.resolve("httpServer").fastify;
  // ethSybilStore = app.context.resolve("ethSybilStore");
  config = app.context.resolve("config");
  db = app.context.resolve("dbClient").db;
});

test.after(async () => {
  await db.delete(EthSybilEntity).execute();
  await app.close();
});

test("Success flow", async () => {

  const wallet = new ethers.Wallet("5e581a243f14358709139a988c71f073afb685d9b28b18b075c6aae662baa6f9");
  const address = wallet.address;
  const redirectURL = new URL("https://example.com");
  const clientSession = crypto.randomUUID();
  // Get proposal
  const proposalResp = await fastify.inject({
    method: "POST",
    url: `/zcred/proposal/${verifierId}`,
    body: {
      subject: {
        id: {
          type: "ethereum:address",
          key: address
        }
      },
      clientSession: clientSession,
      redirectURL: redirectURL.href
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
      credential: credentialEthAddress
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
  const hexSignature = await wallet.signMessage(proposal.challenge.message);
  const signature = u8a.toString(u8a.fromString(hexSignature.substring(2), "hex"), "base58btc");

  // Build proving result
  const originInput = new InputTransformer(
    proposal.program.inputSchema,
    trgraph
  ).toInput(setup);

  const provingResult: ProvingResult = {
    signature: signature,
    proof: jsonProof.proof,
    publicInput: originInput["public"],
    verificationKey: verificationKey.data,
    message: proposal.challenge.message
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
  const receivedRedirectURL = new URL(authResult.redirectURL);
  const receivedClientSession = receivedRedirectURL.searchParams.get("clientSession");
  a.is(receivedClientSession, clientSession, `Client session not defined in query`);
  a.is(receivedRedirectURL.origin, redirectURL.origin, "Redirect URL not match");
  const status = receivedRedirectURL.searchParams.get("status");
  a.is(status, "success", `Redirect URL query string status is not "success"`);
  const getEthSybilResp = await fastify.inject({
    path: `/api/eth-sybil/${address}`,
    method: "GET"
  });
  a.is(
    getEthSybilResp.statusCode, 200,
    `Get eth sybil resp status code is not 200. Body ${getEthSybilResp.body}`
  );
  const ethSybil = JSON.parse(getEthSybilResp.body) as Pick<EthSybilEntity, "sybilId" | "signature" | "address">;
  const hashInput = Uint8Array.from([
    ...getBytes(ethSybil.address), ...getBytes(ethSybil.sybilId)
  ]);
  const publicKey = secp256k1.publicKeyCreate(getBytes(config.ethSybilContractOwnerPrivateKey));

  const sybilVerified = secp256k1.ecdsaVerify(
    getBytes(ethSybil.signature).slice(0, 64),
    getBytes(keccak256(hashInput)),
    publicKey
  );
  a.ok(sybilVerified, "Sybil signature is not verified");
  const fullSignature = getBytes(ethSybil.signature);
  const ecdsaRecover = secp256k1.ecdsaRecover(
    fullSignature.slice(0, 64),
    fullSignature[64]! === 27 ? 0 : 1,
    getBytes(keccak256(hashInput)),
  );
  a.is(hexlify(ecdsaRecover), hexlify(publicKey), "Recovered public key not match");

});


const credentialEthAddress = {
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
    "issuanceDate": "2024-06-19T10:01:57.587Z",
    "validFrom": "2014-12-31T21:00:00.000Z",
    "validUntil": "2029-12-31T21:00:00.000Z",
    "subject": {
      "id": {
        "type": "ethereum:address",
        "key": "0xcee05036e05350c2985582f158aee0d9e0437446"
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
        "signature": "7mXCMUrPtqxjMK7V2cB4hXy23sJvNpX2tzVQ9horxbS5gpvqyTtYAVNiAPjJ4kGayHocb5EFAaJmA5CuBi1BMSTj5JohR54S",
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
                  "0xhex-bytes",
                  "bytes-uint",
                  "uint-mina:field"
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
    "jws": "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDprZXk6ejZNa21TWkd5aE1rTkhIR0NnUVJKYVN2NXlRbjVqMjgzZEZ0clpHNnp1QmpNREttI3o2TWttU1pHeWhNa05ISEdDZ1FSSmFTdjV5UW41ajI4M2RGdHJaRzZ6dUJqTURLbSJ9..6tJkTYGbL8VZG4aHkbLQDg5s-2IRELicr10Qbx8A5hitbtHRuUcsHi66S980OMcaD0jZVs6XIpA6OAROqeF-BQ"
  }
};

test.run();