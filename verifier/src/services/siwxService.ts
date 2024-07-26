import siwe from "siwe";
import { ethers } from "ethers";
import { Config } from "../backbone/config.js";
import { tokens } from "typed-inject";

type Validate = {
  message: string;
  signature: string;
}

export class SiwxService {

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
      domain,
      address,
      statement
    } = siweObject;
    if (options?.statement && options.statement !== statement) {
      throw new Error(`SIWX statement must be "${options.statement}"`);
    }
    if (!expirationTime) {
      throw new Error(`SIWX must has expiration-time property`);
    }
    if (new Date().getTime() > new Date(expirationTime).getTime()) {
      throw new Error(`SIWX is expired`);
    }
    const recoverAddress = ethers.verifyMessage(message, signature);
    if (address.toLowerCase() !== recoverAddress.toLowerCase()) {
      throw new Error(`Invalid SIWX message or signature`);
    }
    const hostnameSplit = new URL(this.config.exposeDomain).hostname.split(".");
    const domainName = [
      hostnameSplit[hostnameSplit.length - 1],
      hostnameSplit[hostnameSplit.length - 2]
    ].join(".");
    if (!domain.endsWith(domainName)) {
      throw new Error(`SIWX invalid domain, domain must end with ${domainName}`);
    }
    return {
      subject: {
        id: {
          type: "ethereum:address",
          key: address
        }
      },
      siwxObject: siweObject
    };
  }
}