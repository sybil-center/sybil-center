import { suite } from "uvu";
import { App } from "../../../../../src/app.js";
import { FastifyInstance } from "fastify";
import { O1TrGraph } from "o1js-trgraph";
import * as o1js from "o1js";
import * as a from "uvu/assert";
import * as u8a from "uint8arrays";
import vm from "node:vm";
import dotenv from "dotenv";
import { PATH_TO_CONFIG } from "../../../../test-util/index.js";
import { ethers } from "ethers";
import { Proposal, ProvingResult } from "../../../../../src/types/index.js";
import { ProgramInitResult } from "../../../../../src/services/o1js-proof-verifier.js";
import { ZkProgramInputTransformer, ZkProgramTranslator } from "@jaljs/o1js";
import { InputTransformer } from "@jaljs/core";


const test = suite("o1js-ethereum-farcaster-followers-num verifier test");

const trgraph = new O1TrGraph(o1js);
const verifierId = "o1js-ethereum-farcaster-follower-num";

let app: App;
let fastify: FastifyInstance;

test.before(async () => {
  dotenv.config({ path: PATH_TO_CONFIG, override: true });
  app = (await App.init());
  fastify = app.context.resolve("httpServer").fastify;
});

test.after(async () => {
  while (!app) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await app.close();
});

test("Success flow", async () => {
  const wallet = new ethers.Wallet("5e581a243f14358709139a988c71f073afb685d9b28b18b075c6aae662baa6f9");
  const address = wallet.address;
  const proposalResp = await fastify.inject({
    url: `/api/zcred/proposal/${verifierId}`,
    method: "GET",
    query: {
      "subject.id.type": "ethereum:address",
      "subject.id.key": address,
      "verifier-id": "ethereum-passport"
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
      credential: farcasterUserCred,
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

const farcasterUserCred = {
  "meta": {
    "issuer": {
      "type": "http",
      "uri": "http://localhost:8080/issuers/farcaster-user"
    },
    "definitions": {
      "attributes": {
        "type": "credential type",
        "issuanceDate": "credential issuance date",
        "validFrom": "credential valid from date",
        "validUntil": "credential valid until date",
        "subject": {
          "id": {
            "type": "credential owner public key type",
            "key": "credential owner public key"
          },
          "fid": "farcaster ID",
          "followingCount": "following count",
          "followerCount": "followers count",
          "custodyAddress": "farcaster custody address",
          "verifiedAddress": "farcaster verified address",
          "username": "farcaster username",
          "displayName": "farcaster display name",
          "registeredAt": "registration date"
        }
      }
    }
  },
  "attributes": {
    "type": "farcaster-user",
    "issuanceDate": "2024-04-09T16:29:41.794Z",
    "validFrom": "2024-04-09T16:29:41.794Z",
    "validUntil": "2029-12-31T21:00:00.000Z",
    "subject": {
      "id": {
        "type": "ethereum:address",
        "key": "0xcee05036e05350c2985582f158aee0d9e0437446"
      },
      "fid": "4924",
      "followingCount": 93,
      "followerCount": 83,
      "custodyAddress": "0x0645388d822d1c39cbc38e9db3ac8b27797a89d5",
      "verifiedAddress": "0xcee05036e05350c2985582f158aee0d9e0437446",
      "username": "eth.eth",
      "displayName": "eth",
      "registeredAt": "2023-08-31T07:32:40.149Z"
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
        "signature": "7mX3B7RopUeZqZW12VjntPNRtsrv6ck79KnnjTDmC2HNv5NYFigcL9r6yvc6GF3xnz5AvaD6RiX2hByKPz8CFrHUJ7Twrh1G",
        "schema": {
          "attributes": {
            "issuanceDate": [
              "isodate-unixtime",
              "unixtime-uint64",
              "uint64-mina:field"
            ],
            "subject": {
              "custodyAddress": [
                "0xhex-bytes",
                "bytes-uint",
                "uint-mina:field"
              ],
              "displayName": [
                "utf8-bytes",
                "bytes-uint",
                "mina:mod.order",
                "uint-mina:field"
              ],
              "fid": [
                "ascii-uint",
                "mina:mod.order",
                "uint-mina:field"
              ],
              "followerCount": [
                "uint128-mina:field"
              ],
              "followingCount": [
                "uint128-mina:field"
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
              "registeredAt": [
                "isodate-unixtime",
                "unixtime-uint64",
                "uint64-mina:field"
              ],
              "username": [
                "utf8-bytes",
                "bytes-uint",
                "mina:mod.order",
                "uint-mina:field"
              ],
              "verifiedAddress": [
                "0xhex-bytes",
                "bytes-uint",
                "uint-mina:field"
              ]
            },
            "type": [
              "ascii-bytes",
              "bytes-uint",
              "mina:mod.order",
              "uint-mina:field"
            ],
            "validFrom": [
              "isodate-unixtime",
              "unixtime-uint64",
              "uint64-mina:field"
            ],
            "validUntil": [
              "isodate-unixtime",
              "unixtime-uint64",
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
    "jws": "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDprZXk6ejZNa3FQc2ZNZGhTZzFIU0dob3hKRzlQbTE2eUVZWjdvR01KbTZRVkFMaHFNM20yI3o2TWtxUHNmTWRoU2cxSFNHaG94Skc5UG0xNnlFWVo3b0dNSm02UVZBTGhxTTNtMiJ9..fiWSm-yFY5IGNPg8FL_tRv3RXrZNckkwsnx6CYpz4yXMR6prr8_xHvlUyAVgFyGhZ_lFzHstjXqplvU5iPZiCA"
  }
};

test.run();