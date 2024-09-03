import { FastifyInstance } from "fastify";
import { CreateClientJalProgram } from "../../src/controllers/jal.controller.js";
import { InitClientSessionDto } from "../../src/models/dtos/init-client-session.dto.js";
import { ProvingResultDto } from "../../src/models/dtos/proving-result.dto.js";
import { JsonZcredException } from "@zcredjs/core";
import crypto from "node:crypto";
import * as u8a from "uint8arrays";
import sortKeys from "sort-keys";
import * as jose from "jose";

export class TestHttpClient {

  constructor(private readonly fastify: FastifyInstance) {}

  async createClientJalProgram(input: CreateClientJalProgram & { jws: string }) {
    return await this.fastify.inject({
      method: "POST",
      path: "/api/v2/jal",
      body: {
        jalProgram: input.jalProgram,
        comment: input.comment
      } satisfies CreateClientJalProgram,
      headers: {
        Authorization: `Bearer ${input.jws}`
      }
    });
  }

  async initVerificationSession(input: {
    jalId: string;
    clientSession: InitClientSessionDto,
    jws: string;
  }) {
    const { jalId, clientSession } = input;
    return await this.fastify.inject({
      method: "POST",
      path: `/api/v2/verifier/${jalId}/session`,
      body: clientSession,
      headers: {
        Authorization: `Bearer ${input.jws}`
      }
    });
  }

  async getVerificationProposal(input: {
    sessionId: string;
    jalId: string
  }) {
    const { sessionId, jalId } = input;
    return await this.fastify.inject({
      method: "GET",
      path: `/api/v2/verifier/${jalId}/proposal?sessionId=${sessionId}`
    });
  }

  async completeVerification(input: {
    result: ProvingResultDto
    jalId: string;
    sessionId: string
  }) {
    const { result, jalId, sessionId } = input;
    return await this.fastify.inject({
      method: "POST",
      path: `/api/v2/verifier/${jalId}/verify?sessionId=${sessionId}`,
      body: result
    });
  }

  async verificationException(input: {
    sessionId: string;
    jalId: string;
    exception: JsonZcredException,
    challengeMessage: string;
  }) {
    const { jalId, sessionId, exception, challengeMessage } = input;
    const secret = crypto.createHash("sha256")
      .update(u8a.fromString(challengeMessage))
      .digest();
    const messageHash = u8a.toString(secret, "hex");
    const challenge = { messageHash: messageHash, nonce: 0 };
    let proof = "";
    for (let nonce = 0; ; nonce++) {
      challenge.nonce = nonce;
      const bytes = u8a.fromString(JSON.stringify(sortKeys(challenge)));
      proof = crypto.createHash("sha256")
        .update(bytes)
        .digest("hex");
      if (proof.startsWith("0".repeat(5))) {
        break;
      }
    }
    const jws = await new jose.CompactSign(
      u8a.fromString(JSON.stringify(sortKeys(challenge)))
    ).setProtectedHeader({ alg: "HS256" })
      .sign(secret);
    return await this.fastify.inject({
      method: "POST",
      path: `/api/v2/verifier/${jalId}/verify?sessionId=${sessionId}`,
      body: exception,
      headers: {
        Authorization: `Bearer ${jws}`
      }
    });
  }

  async getVerificationResult(input: {
    jws: string;
    verificationResultId: string;
  }) {
    const { jws, verificationResultId } = input;
    return await this.getVerificationResultByPath({
      jws: jws,
      path: `/api/v2/verification-result/${verificationResultId}`
    });
  }

  async getVerificationResultByPath(input: {
    path: string;
    jws: string;
  }) {
    const { path, jws } = input;
    return await this.fastify.inject({
      method: "GET",
      path: path,
      headers: {
        Authorization: `Bearer ${jws}`
      }
    });
  }
}