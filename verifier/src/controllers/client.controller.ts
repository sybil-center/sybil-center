import { Injector } from "typed-inject";
import { DI } from "../app.js";
import siwe from "siwe";
import { ethers } from "ethers";

const COOKIE_CLIENT_TOKEN = "client-token";

export function ClientController(injector: Injector<DI>) {
  const fastify = injector.resolve("httpServer").fastify;
  const clientService = injector.resolve("clientService");
  const config = injector.resolve("config");

  /** Create Client account using SIWE*/
  fastify.post<{
    Body: {
      /** SIWE message */
      message: string;
      /** SIWE signature */
      signature: string;
    }
  }>("/api/v1/client", {
    schema: {
      body: {
        type: "object",
        required: ["message", "signature"],
        properties: {
          message: { type: "string" },
          signature: { type: "string" }
        }
      }
    }
  }, async (req, resp) => {
    try {
      const { message, signature } = req.body;
      const { siweMessage, errMsg } = parseSIWE(message);
      if (errMsg) {
        resp.statusCode = 400;
        return { message: errMsg };
      }
      const vr = validateSIWE(siweMessage!);
      const { address, expirationTime } = siweMessage!;
      if (vr.errMsg) {
        resp.statusCode = 400;
        return { message: vr.errMsg };
      }
      const signAddress = ethers.verifyMessage(message, signature).toLowerCase();
      if (signAddress !== address.toLowerCase()) {
        resp.statusCode = 400;
        return { message: "Invalid signature" };
      }
      const { subjectId } = await clientService.create({
        subjectId: `ethereum:address:${address.toLowerCase()}`
      });
      const jwt = fastify.jwt.sign({
        subjectId: subjectId
      }, {
        expiresIn: `${new Date(expirationTime!).getTime() - new Date().getTime()}ms`
      });
      resp.setCookie(COOKIE_CLIENT_TOKEN, jwt, {
        httpOnly: true,
        sameSite: "strict",
        expires: new Date(expirationTime!)
      });
      resp.statusCode = 201;
      return { subjectId: subjectId };
    } catch (e: any) {
      resp.statusCode = 400;
      return { message: e.message };
    }
  });

  fastify.get<{
    Params: { subjectId: string }
  }>("/api/v1/client/:subjectId", async (req, resp) => {
    const subjectId = req.params.subjectId;
    const client = await clientService.getBySubjectId(subjectId);
    if (!client) {
      resp.statusCode = 400;
      return { message: `No client with subjectId: ${subjectId}` };
    }
    return client;
  });

  fastify.post<{
    Body: {
      /** SIWE message */
      message: string;
      /** SIWE signature */
      signature: string;
    }
  }>("/api/v1/client/login", {
    schema: {
      body: {
        type: "object",
        required: ["message", "signature"],
        properties: {
          message: { type: "string" },
          signature: { type: "string" }
        }
      }
    }
  }, async (req, resp) => {
    const { message, signature } = req.body;
    const { siweMessage, errMsg } = parseSIWE(message);
    if (errMsg) {
      resp.statusCode = 400;
      return { message: errMsg };
    }
    const vr = validateSIWE(siweMessage!);
    const { address, expirationTime } = siweMessage!;
    if (vr.errMsg) {
      resp.statusCode = 400;
      return { message: vr.errMsg };
    }
    const signAddress = ethers.verifyMessage(message, signature).toLowerCase();
    if (signAddress !== address.toLowerCase()) {
      resp.statusCode = 400;
      return { message: "Invalid signature" };
    }
    const subjectId = `ethereum:address:${address.toLowerCase()}`;
    const client = await clientService.getBySubjectId(subjectId);
    if (!client) {
      resp.statusCode = 400;
      return { message: "Sign in first" };
    }
    const jwt = fastify.jwt.sign({
      subjectId: subjectId
    }, {
      expiresIn: `${new Date(expirationTime!).getTime() - new Date().getTime()}ms`
    });
    resp.setCookie(COOKIE_CLIENT_TOKEN, jwt, {
      httpOnly: true,
      sameSite: "strict",
      expires: new Date(expirationTime!)
    });
    return { message: "ok" };
  });

  fastify.post("/api/v1/client/logout", async (req, resp) => {
    const tokenCookie = req.cookies[COOKIE_CLIENT_TOKEN];
    if (tokenCookie) {
      resp.setCookie(COOKIE_CLIENT_TOKEN, "", {
        httpOnly: true,
        sameSite: "strict",
        expires: new Date()
      });
    }
    return { message: "ok" };
  });

  fastify.post<{
    Body: {
      redirectURL: string
    }
  }>("/api/v1/client/redirect-url", {
    schema: {
      body: {
        type: "object",
        required: ["redirectURL"],
        properties: {
          redirectURL: { type: "string", format: "uri" }
        }
      }
    }
  }, async (req, resp) => {
    const clientJWT = req.cookies[COOKIE_CLIENT_TOKEN];
    const decoded = verifyJWT(clientJWT);
    if (!decoded) {
      resp.statusCode = 403;
      return { message: "Login first" };
    }
    const client = await clientService.setRedirectURL(decoded.subjectId, new URL(req.body.redirectURL));
    resp.statusCode = 201;
    return client;
  });

  fastify.delete<{
    Body: {
      accessToken: string
    }
  }>("/api/v1/client/access-token", {
    schema: {
      body: {
        type: "object",
        properties: {
          accessToken: { type: "string" }
        }
      }
    }
  }, async (req, resp) => {
    const clientJWT = req.cookies[COOKIE_CLIENT_TOKEN];
    const decoded = verifyJWT(clientJWT);
    if (!decoded) {
      resp.statusCode = 403;
      return { message: "Ling first" };
    }
    return await clientService.deleteAccessToken(
      decoded.subjectId,
      req.body.accessToken
    );
  });

  function verifyJWT(token: string | undefined): { subjectId: string } | null {
    if (!token) return null;
    try {
      return fastify.jwt.verify<{ subjectId: string }>(token);
    } catch (e) {
      return null;
    }
  }

  function validateSIWE(siweMessage: siwe.SiweMessage): {
    errMsg: string;
    isValid: boolean;
  } {
    try {
      const {
        uri,
        expirationTime,
        statement,
        // domain
      } = siweMessage;
      if (!expirationTime) return {
        errMsg: "Invalid SIWE. SIWE must has expiration time",
        isValid: false
      };
      if (expirationTime && new Date(expirationTime).getTime() < new Date().getTime()) return {
        errMsg: "Invalid SIWE. Invalid expiration time",
        isValid: false
      };
      const expURI = new URL(config.exposeDomain).origin;
      if (expURI !== new URL(uri).origin) return {
        errMsg: `Invalid SIWE. Invalid URI, expected URI: ${expURI}`,
        isValid: false
      };
      // if (domain !== new URL(config.frontendOrigin).hostname) return {
      //   errMsg: `Invalid SIWE. Invalid domain, expected domain: ${domain}`,
      //   isValid: false
      // };
      if (statement !== "Create account" && statement !== "Login") return {
        errMsg: `Invalid SIWE. Statement must be: "Create account" or "Login"`,
        isValid: false
      };
      return {
        errMsg: "",
        isValid: true
      };
    } catch (e) {
      return { errMsg: "Invalid SIWE", isValid: false };
    }
  }

  function parseSIWE(siweMsg: string): { siweMessage?: siwe.SiweMessage; errMsg: string } {
    try {
      return { siweMessage: new siwe.SiweMessage(siweMsg), errMsg: "" };
    } catch (e) {
      return { errMsg: "Invalid SIWE" };
    }
  }
}

ClientController.COOKIE_CLIENT_TOKEN = COOKIE_CLIENT_TOKEN;

