import siwe from "siwe";
import { ethers } from "ethers";
import { Config } from "../backbone/config.js";
import { tokens } from "typed-inject";

type Validate = {
  message: string;
  signature: string;
}

export class SiweService {

  static inject = tokens("config");
  constructor(
    private readonly config: Config) {
  }

  async verify({
      message,
      signature,
    }: Validate,
    options?: {
      statement?: string
    }) {
    const siweObject = new siwe.SiweMessage(message);
    const {
      expirationTime,
      address,
      statement,
      uri
    } = siweObject;
    if (options?.statement && options.statement !== statement) {
      throw new Error(`SIWE statement must be "${options.statement}"`);
    }
    if (!expirationTime) {
      throw new Error(`SIWE must has expiration-time property`);
    }
    if (new Date().getTime() > new Date(expirationTime).getTime()) {
      throw new Error(`SIWE is expired`);
    }
    const recoverAddress = ethers.verifyMessage(message, signature);
    if (address.toLowerCase() !== recoverAddress.toLowerCase()) {
      throw new Error(`Invalid SIWE message or signature`);
    }
    if (new URL(uri).hostname !== this.config.exposeDomain.hostname) {
      throw new Error(`SIWE incorrect uri hostname, expected: ${this.config.exposeDomain.hostname}`)
    }
    return {
      subject: {
        id: {
          type: "ethereum:address",
          key: address
        }
      },
      siweObject: siweObject
    };
  }
}