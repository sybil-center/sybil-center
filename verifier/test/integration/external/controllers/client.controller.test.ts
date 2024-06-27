import { suite } from "uvu";
import { App } from "../../../../src/app.js";
import { FastifyInstance } from "fastify";
import dotenv from "dotenv";
import { PATH_TO_CONFIG } from "../../../test-util/index.js";
import { ethers } from "ethers";
import { Config } from "../../../../src/backbone/config.js";
import siwe from "siwe";
import * as a from "uvu/assert";
import { ClientEntity } from "../../../../src/entities/client.entity.js";
import { ClientController } from "../../../../src/controllers/client.controller.js";

const test = suite("Client controller tests");

let app: App;
let config: Config;
let fastify: FastifyInstance;

test.before(async () => {
  dotenv.config({ path: PATH_TO_CONFIG, override: true });
  app = await App.init();
  fastify = app.context.resolve("httpServer").fastify;
  config = app.context.resolve("config");
});

test.after(async () => {
  while (!app) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  await app.close();
});

test("create client & login & add redirectURL & delete access token & logout", async () => {
  const wallet = ethers.Wallet.createRandom();
  const address = wallet.address;
  const subjectId = `ethereum:address:${address.toLowerCase()}`;

  // create clien

  const createSiweMessage = new siwe.SiweMessage({
    // domain: new URL(config.frontendOrigin).hostname,
    statement: "Create account",
    expirationTime: new Date(new Date().getTime() + 24 * 3600 * 1000).toISOString(),
    issuedAt: new Date().toISOString(),
    uri: config.exposeDomain.origin,
    address: wallet.address,
    version: "1",
    chainId: 1,
    nonce: siwe.generateNonce()
  });
  const createMessage = createSiweMessage.toMessage();
  const createSignature = await wallet.signMessage(createMessage);
  const createClientResp = await fastify.inject({
    path: "/api/v1/client",
    method: "POST",
    payload: {
      message: createMessage,
      signature: createSignature
    }
  });
  a.is(createClientResp.statusCode, 201, `Create client response status is not 201, ${createClientResp.body}`);
  const clientCookie = createClientResp.cookies.find((it) => it.name === "client-token");
  a.ok(clientCookie, "No client token JWT");
  const decoded = fastify.jwt.verify<{ subjectId: string }>(clientCookie.value);
  a.is(decoded.subjectId, subjectId, "Subject id from JWT not match");
  const clientBody = JSON.parse(createClientResp.body) as { subjectId: string };
  a.is(clientBody.subjectId, subjectId, "Subject ids not match");

  // login

  const siweMessage = new siwe.SiweMessage({
    // domain: new URL(config.frontendOrigin).hostname,
    statement: "Login",
    expirationTime: new Date(new Date().getTime() + 24 * 3600 * 1000).toISOString(),
    issuedAt: new Date().toISOString(),
    uri: config.exposeDomain.origin,
    address: wallet.address,
    version: "1",
    chainId: 1,
    nonce: siwe.generateNonce()
  });
  const message = siweMessage.toMessage();
  const signature = await wallet.signMessage(message);
  const loginClientResp = await fastify.inject({
    path: "/api/v1/client/login",
    method: "POST",
    payload: {
      message: message,
      signature: signature
    }
  });
  a.is(loginClientResp.statusCode, 200, "Login client status code is not 200");
  const loginBody = JSON.parse(loginClientResp.body) as { message: string };
  a.is(loginBody.message, "ok", `Login body message is not "ok"`);
  const loginClientCookie = loginClientResp.cookies.find((it) => it.name === "client-token");
  a.ok(loginClientCookie, "Client cookie not found");
  const decodedJWT = fastify.jwt.verify<{ subjectId: string }>(loginClientCookie.value);
  a.is(decodedJWT.subjectId, subjectId, `Decoded JWT subject id not match`);

  // add redirect URL

  const redirectURL = new URL("https://example.com").href;
  const addRedirURLResp = await fastify.inject({
    path: "/api/v1/client/redirect-url",
    method: "POST",
    cookies: { [loginClientCookie.name]: loginClientCookie.value },
    payload: {
      redirectURL: redirectURL
    }
  });
  a.is(addRedirURLResp.statusCode, 201, "Add redirect URL resp status code is not 201");
  const addRedirURLBody = JSON.parse(addRedirURLResp.body) as ClientEntity;
  a.is(addRedirURLBody.subjectId, subjectId, "Subject ids no match, 1");
  a.ok(addRedirURLBody.tokenMap, "No token Map in client entity");
  const accessToken = Object.keys(addRedirURLBody.tokenMap)[0];
  a.ok(accessToken, "No access token in token map");

  // delete access token

  const deleteATResp = await fastify.inject({
    path: "/api/v1/client/access-token",
    method: "DELETE",
    payload: {
      accessToken: accessToken
    },
    cookies: { [clientCookie.name]: clientCookie.value }
  });
  a.is(deleteATResp.statusCode, 200, "Delete access token status code is not 200");
  const deleteATBody = JSON.parse(deleteATResp.body) as { subjectId: string };
  a.is(deleteATBody.subjectId, subjectId, "Subject id not match");
  a.not.ok(deleteATResp.cookies.find((it) => it.name === "client-token"));

  const logoutResp = await fastify.inject({
    path: "/api/v1/client/logout",
    method: "POST"
  });
  a.is(
    logoutResp.statusCode, 200,
    `Logout response status code is not 200. Body ${logoutResp.body}`
  );
  a.not.ok(logoutResp.cookies.find((it) => it.name === ClientController.COOKIE_CLIENT_TOKEN));


  // get client

  const getClientResp = await fastify.inject({
    path: `/api/v1/client/${subjectId}`,
    method: "GET"
  });
  a.is(getClientResp.statusCode, 200, `Client with subjectId: ${subjectId}, not found`);
  const client = JSON.parse(getClientResp.body) as ClientEntity;
  a.equal(client, {
    id: client.id,
    subjectId: subjectId,
    tokenMap: {}
  });
});

test("client not found", async () => {
  const wallet = ethers.Wallet.createRandom();
  const address = wallet.address;
  const subjectId = `ethereum:address:${address.toLowerCase()}`;
  const getClientResp = await fastify.inject({
    path: `/api/v1/client/${subjectId}`,
    method: "GET"
  });
  a.is(getClientResp.statusCode, 400, "Get client response is not 400");
});

// test.run();