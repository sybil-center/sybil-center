import { suite } from "uvu";
import { App } from "../../../../src/app.js";
import { FastifyInstance } from "fastify";
import { DbClient } from "../../../../src/backbone/db-client.js";
import { Config } from "../../../../src/backbone/config.js";
import dotenv from "dotenv";
import { PATH_TO_CONFIG, testUtil } from "../../../test-util/index.js";
import { JalEntity } from "../../../../src/entities/jal.entity.js";
import { ProvingResultEntity } from "../../../../src/entities/proving-result.entity.js";
import { assert, Const, equal, greaterOrEqual, mul, Static, sub, toJAL } from "@jaljs/js-zcred";
import { DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA } from "@sybil-center/passport";
import { O1GraphLink, O1TrGraph } from "o1js-trgraph";
import crypto from "node:crypto";
import * as a from "uvu/assert";
import { KeyvEntity } from "../../../../src/entities/keyv.entity.js";
import * as o1js from "o1js";
import siwe from "siwe";
import { SIWE_STATEMENT } from "../../../../src/consts/index.js";
import { StrictId } from "@zcredjs/core";
import { JalCommentEntity } from "../../../../src/entities/jal-comment.entity.js";
import { Proposal, ProvingResult } from "../../../../src/types/index.js";
import { ZkProgramInputTransformer, ZkProgramTranslator } from "@jaljs/o1js";
import { ProgramInitResult } from "../../../../src/services/o1js-proof-verifier.js";
import { InputTransformer } from "@jaljs/core";
import vm from "node:vm";
import * as u8a from "uint8arrays";
import { VerificationResultEntity } from "../../../../src/entities/verification-result.entity.js";
import { ethers } from "ethers";


const test = suite("Custom verifier tests");

const trgraph = new O1TrGraph(o1js);

let app: App;
let fastify: FastifyInstance;
let db: DbClient["db"];
let config: Config;


test.before(async () => {
  dotenv.config({ path: PATH_TO_CONFIG, override: true });
  app = await App.init();
  fastify = app.context.resolve("httpServer").fastify;
  config = app.context.resolve("config");
  db = app.context.resolve("dbClient").db;
});

test.after(async () => {
  await db.delete(ProvingResultEntity).execute();
  await db.delete(JalCommentEntity).execute();
  await db.delete(VerificationResultEntity).execute();
  await db.delete(JalEntity).execute();
  await db.delete(KeyvEntity).execute();
  await app.close();
});

const {
  credential,
  context
} = DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA;
const attributes = credential.attributes;
const jal = toJAL({
  target: "o1js:zk-program.cjs",
  credential: credential,
  publicInput: [
    attributes.document.sybilId,
    context.now
  ],
  commands: [
    assert(
      greaterOrEqual(
        sub(context.now, attributes.subject.birthDate),
        mul(Static<O1GraphLink>(18, ["uint64-mina:field"]), Const("year"))
      )
    ),
    assert(
      equal(
        attributes.countryCode,
        Static("GBR", ["iso3166alpha3-iso3166numeric", "iso3166numeric-uint16", "uint16-mina:field"])
      )
    ),
    assert(
      greaterOrEqual(attributes.validUntil, context.now)
    )
  ],
  options: {
    signAlgorithm: "mina:pasta",
    hashAlgorithm: "mina:poseidon"
  }
});


test("create verifier, auth process ", async () => {
  // create JAL
  const createJalResp = await fastify.inject({
    path: "/api/v1/jal",
    method: "POST",
    payload: jal
  });
  a.is(
    createJalResp.statusCode, 201,
    `Create JAL resp status code is not 201. Resp body: ${createJalResp.body}`
  );
  const { id: jalId } = JSON.parse(createJalResp.body);
  a.ok(jalId, "JAL id is undefined in create JAL response body");

  // get proposal
  const wallet = new ethers.Wallet("5e581a243f14358709139a988c71f073afb685d9b28b18b075c6aae662baa6f9");
  const address = wallet.address;
  const redirectURL = new URL("https://example.com");
  const clientSession = crypto.randomUUID();

  const proposalResp = await fastify.inject({
    path: `/api/v1/verifier/${jalId}/proposal`,
    method: "POST",
    body: {
      subject: {
        id: {
          type: "ethereum:address",
          key: address
        }
      },
      clientSession: clientSession,
      redirectURL: redirectURL.href,
      issuer: {
        type: "http",
        uri: "https://dev.issuer.sybil.center/issuers/passport/"
      }
    }
  });
  a.is(
    proposalResp.statusCode, 200,
    `Proposal response status code is not 200. Response body: ${proposalResp.body}`
  );
  const proposal: Proposal = JSON.parse(proposalResp.body);
  // calculate proof
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
    verificationKey: verificationKey.data
  };

  const verifierURL = new URL(proposal.verifierURL);
  const injectVerifierURL = verifierURL.pathname + verifierURL.search;
  a.is(new URL(verifierURL.origin).href, new URL(config.exposeDomain).href);
  const authResp = await fastify.inject({
    method: "POST",
    url: injectVerifierURL,
    body: provingResult
  });
  a.is(authResp.statusCode, 200, `Auth response status code is not 200. Resp body: ${authResp.body}`);
  const authResult: { redirectURL: string } = JSON.parse(authResp.body);
  a.ok(authResult.redirectURL, `"redirect url is undefined"`);
  const receivedRedirectURL = new URL(authResult.redirectURL);
  a.type(authResult.redirectURL, "string", `"redirect url is not string"`);
  const receivedClientSession = receivedRedirectURL.searchParams.get("clientSession");
  a.is(receivedClientSession, clientSession, `Client session not defined in query`);
  a.is(receivedRedirectURL.origin, redirectURL.origin, "Redirect URL not match");
  const status = receivedRedirectURL.searchParams.get("status");
  a.is(status, "success", `Redirect URL query string status is not "success"`);
  const provingResultURLStr = receivedRedirectURL.searchParams.get("provingResultURL");
  a.ok(provingResultURLStr, "provingResultURL is undefined in redirectURL");
  const provingResultURL = new URL(provingResultURLStr);
  const injectProvingResultURL = provingResultURL.pathname + provingResultURL.search;
  const provingResultResp = await fastify.inject({
    path: injectProvingResultURL,
    method: "GET"
  });
  a.is(
    provingResultResp.statusCode, 200,
    `Proving result response status code is not 200. Resp body ${provingResultResp.body}`
  );
  const result = JSON.parse(provingResultResp.body);
  a.ok(result.jalId, "Received proving result has not jalId field");
  a.ok(result.jalURL, "Received proving result has not jalURL field");
  const getJalResp = await fastify.inject({
    path: new URL(result.jalURL).pathname,
    method: "GET"
  });
  a.is(
    getJalResp.statusCode, 200,
    `Get JAL response status code is not 200. Response body: ${getJalResp.body}`
  );
});

test("invalid credential", async () => {
  const {
    credential,
    context
  } = DEV_O1JS_ETH_PASSPORT_INPUT_SCHEMA;
  const attributes = credential.attributes;
  const jal = toJAL({
    target: "o1js:zk-program.cjs",
    credential: credential,
    publicInput: [
      attributes.subject.id.type,
      attributes.subject.id.key,
      attributes.document.sybilId,
      context.now
    ],
    commands: [
      assert(
        greaterOrEqual(
          sub(context.now, attributes.subject.birthDate),
          mul(Static<O1GraphLink>(18, ["uint64-mina:field"]), Const("year"))
        )
      )
    ],
    options: {
      signAlgorithm: "mina:pasta",
      hashAlgorithm: "mina:poseidon"
    }
  });
  const createJalResp = await fastify.inject({
    path: "/api/v1/jal",
    method: "POST",
    payload: jal
  });
  a.is(
    createJalResp.statusCode, 201,
    `Create JAL resp status code is not 200. Resp body: ${createJalResp.body}`
  );
  const { id: jalId } = JSON.parse(createJalResp.body);
  a.ok(jalId, "JAL id is undefined in  onse body");

  // get proposal
  const wallet = new ethers.Wallet("5e581a243f14358709139a988c71f073afb685d9b28b18b075c6aae662baa6f9");
  const address = wallet.address;
  const redirectURL = new URL("https://example.com");
  const clientSession = crypto.randomUUID();

  const proposalResp = await fastify.inject({
    path: `/api/v1/verifier/${jalId}/proposal`,
    method: "POST",
    body: {
      subject: {
        id: {
          type: "ethereum:address",
          key: address
        }
      },
      clientSession: clientSession,
      redirectURL: redirectURL.href,
      issuer: {
        type: "http",
        uri: "https://dev.issuer.sybil.center/issuers/passport/"
      }
    }
  });
  a.is(
    proposalResp.statusCode, 200,
    `Proposal response status code is not 200. Response body: ${proposalResp.body}`
  );
  const proposal: Proposal = JSON.parse(proposalResp.body);
  // calculate proof
  const translator = new ZkProgramTranslator(o1js, "commonjs");
  const programCode = translator.translate(proposal.program);
  const module = new vm.Script(programCode).runInThisContext();
  const { zkProgram, PublicInput } = (await module.initialize(o1js) as ProgramInitResult);
  const setup = {
    private: {
      credential: getInvalidEthCred()
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
  let isJsonProofError = false;
  try {
    await zkProgram.execute(
      new PublicInput(transformedInput.public),
      ...transformedInput.private
    ).then((proof) => proof.toJSON());
  } catch (e) {
    isJsonProofError = true;
  }
  a.ok(isJsonProofError, `ZK-proof creation must throw error`);
});

test("verification through v2", async () => {
  // create jal program with comment;

  const createJALSiweMessage = new siwe.SiweMessage({
    domain: getServerDomainName(),
    expirationTime: new Date(new Date().getTime() + 100 * 1000).toISOString(),
    address: testUtil.ethereum.address,
    statement: SIWE_STATEMENT.CREATE_JAL,
    uri: new URL("./api/v2/jal", config.exposeDomain).href,
    nonce: siwe.generateNonce(),
    version: "1",
    chainId: 1,
    issuedAt: new Date().toISOString()
  }).toMessage();
  const createJALSiweSignature = await testUtil.ethereum.signMessage(createJALSiweMessage);
  const createJalResp = await fastify.inject({
    path: "/api/v2/jal",
    method: "POST",
    body: {
      siwe: {
        message: createJALSiweMessage,
        signature: createJALSiweSignature
      },
      jalProgram: jal,
      comment: "Comment"
    }
  });
  a.is(createJalResp.statusCode, 201, `Create JAL status code resp is not 201. Resp body: ${createJalResp.body}`);
  const { id: jalId } = JSON.parse(createJalResp.body) as { id: string };
  // get proposal
  const redirectURL = new URL("https://example.com").href;
  const getProposalSiweMessage = new siwe.SiweMessage({
    domain: getServerDomainName(),
    expirationTime: new Date(new Date().getTime() + 100 * 1000).toISOString(),
    address: testUtil.ethereum.address,
    statement: SIWE_STATEMENT.GET_PROPOSAL,
    uri: new URL(`./api/v2/verifier/${jalId}/proposal`, config.exposeDomain).href,
    nonce: siwe.generateNonce(),
    version: "1",
    chainId: 1,
    issuedAt: new Date().toISOString()
  }).toMessage();
  const getProposalSiweSignature = await testUtil.ethereum.signMessage(getProposalSiweMessage);
  const clientSession = crypto.randomUUID();
  const proposalResp = await fastify.inject({
    path: `/api/v2/verifier/${jalId}/proposal`,
    method: "POST",
    body: {
      subject: {
        id: {
          type: "ethereum:address",
          key: testUtil.ethereum.address
        } satisfies StrictId
      },
      client: {
        session: clientSession,
        siwe: {
          message: getProposalSiweMessage,
          signature: getProposalSiweSignature
        }
      },
      redirectURL: redirectURL,
      issuer: {
        type: "http",
        uri: "https://dev.issuer.sybil.center/issuers/passport/"
      }
    }
  });
  a.is(proposalResp.statusCode, 200, `Proposal response status code is not 200, Resp body: ${proposalResp.body}`);
  const proposal = JSON.parse(proposalResp.body) as Proposal;
  // calculate proof
  const provingResult = await createProvingResult({
    proposal: proposal,
    signMessage: testUtil.ethereum.signMessage
  });

  const verifierURL = new URL(proposal.verifierURL);
  const injectVerifierURL = verifierURL.pathname + verifierURL.search;
  a.is(new URL(verifierURL.origin).href, new URL(config.exposeDomain).href);
  const authResp = await fastify.inject({
    method: "POST",
    url: injectVerifierURL,
    body: provingResult
  });
  a.is(authResp.statusCode, 200, `Auth response status code is not 200. Resp body: ${authResp.body}`);
  const authResult: { redirectURL: string } = JSON.parse(authResp.body);
  a.ok(authResult.redirectURL, `"redirect url is undefined"`);
  const receivedRedirectURL = new URL(authResult.redirectURL);
  a.is(receivedRedirectURL.searchParams.get("clientSession"), clientSession, `Client session from "redirectURL" is not match`);
  a.is(receivedRedirectURL.searchParams.get("status"), "success", `status is not match from "redirectURL"`);
  a.ok(receivedRedirectURL.searchParams.get("verificationResultId"), `"verificationResultId" from "redirectURL" is not defined`);
  // verify verification result

});

test.run();

function getServerDomainName() {
  const hostnameSplit = new URL(config.exposeDomain).hostname.split(".");
  return [
    hostnameSplit[hostnameSplit.length - 1],
    hostnameSplit[hostnameSplit.length - 2]
  ].join(".");
}

async function createProvingResult(o: {
  proposal: Proposal,
  signMessage: (msg: string | Uint8Array) => Promise<string>
}) {
  const {
    proposal,
    signMessage
  } = o;
  // calculate proof
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
  const hexSignature = await signMessage(proposal.challenge.message);
  const signature = u8a.toString(u8a.fromString(hexSignature.substring(2), "hex"), "base58btc");

  // Build proving result
  const originInput = new InputTransformer(
    proposal.program.inputSchema,
    trgraph
  ).toInput(setup);

  return {
    signature: signature,
    proof: jsonProof.proof,
    publicInput: originInput["public"],
    verificationKey: verificationKey.data
  } satisfies ProvingResult;
}

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
} as const;

function getInvalidEthCred() {
  const invalidCred = JSON.parse(JSON.stringify(credentialEthAddress));
  invalidCred.attributes.subject.birthDate = new Date(1970, 1, 1).toISOString();
  return invalidCred;
}