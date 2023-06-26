import { ICaptchaService } from "./captcha.service.js";
import { Config } from "../../backbone/config.js";
import { CredentialVerifier } from "./credential-verifivator.js";
import { tokens } from "typed-inject";
import { CredentialOptions, credentialUtil } from "../../util/credential.utils.js";
import { ClientError, ServerError } from "../../backbone/errors.js";
import { FastifyRequest } from "fastify";
import { ThrowDecoder } from "../../util/throw-decoder.util.js";
import { Credential } from "../types/credential.js";

export interface IGateService {
  build(): Gate;
}

export type OpenResult = {
  readonly opened: boolean;
  readonly reason: string;
  readonly errStatus?: number;
}

type OpenFn = () => Promise<OpenResult>

type Thrower = (openResult: OpenResult) => never;

export class GateService implements IGateService {
  static inject = tokens(
    "config",
    "captchaService",
    "credentialVerifier"
  );
  constructor(
    private readonly config: Config,
    private readonly captchaService: ICaptchaService,
    private readonly credentialVerifier: CredentialVerifier
  ) {}

  build(): Gate {
    return new Gate(
      this.config,
      this.captchaService,
      this.credentialVerifier
    );
  }
}

class Gate {
  private readonly opens: OpenFn[] = [];

  constructor(
    private readonly config: Config,
    private readonly captchaService: ICaptchaService,
    private readonly credentialVerifier: CredentialVerifier,
  ) {}

  setLock(openFn: OpenFn): Gate {
    this.opens.push(openFn);
    return this;
  }

  checkFrontend(req: FastifyRequest): Gate {
    this.setLock(async () => {
      const frontendDomain = this.config.frontendOrigin.origin;
      const referer = req.headers.referer;
      if (!referer) return {
        opened: false,
        reason: "Referer header is undefined",
        errStatus: 403
      };
      const origin = new URL(referer).origin;
      if (origin !== frontendDomain) return {
        opened: false,
        reason: "Forbidden",
        errStatus: 403
      };
      return {
        opened: true,
        reason: ""
      };
    });
    return this;
  }

  validateCredential(credential: Credential, option: CredentialOptions): Gate {
    credential = ThrowDecoder
      .decode(Credential, credential, new ClientError("Invalid credential"));
    this.setLock(async () => {
      const { valid, reason } = credentialUtil.validate(credential, option);
      return {
        opened: valid,
        reason: reason ? reason : "",
        errStatus: 400
      };
    });
    return this;
  }

  verifyCredential(credential: Credential): Gate {
    credential = ThrowDecoder
      .decode(Credential, credential, new ClientError("Invalid credential"));
    this.setLock(async () => {
      const { isVerified } = await this.credentialVerifier.verify(credential);
      return {
        opened: isVerified,
        reason: !isVerified ? `Credential is not verified` : "",
        errStatus: !isVerified ? 400 : undefined
      };
    });
    return this;
  }

  captchaRequired(captcha?: string): Gate {
    this.setLock(async () => {
      if (this.config.captchaRequired && !captcha) return {
        opened: false,
        reason: `Captcha token required`,
        errStatus: 400
      };
      return {
        opened: true,
        reason: ""
      };
    });
    return this;
  }

  validateCaptcha(
    captcha?: string,
    options?: { action?: string, score?: number }
  ): Gate {
    this.setLock(async () => {
      try {
        if (!captcha) return { opened: true, reason: "" };
        const { isHuman, score } = await this.captchaService.isHuman(captcha, options?.action);
        if (options?.score && score < options.score) return {
          opened: false,
          reason: `Human captcha score less than ${options.score}`,
          errStatus: 403
        };
        return {
          opened: isHuman,
          reason: !isHuman ? `Robot action detected` : "",
          errStatus: !isHuman ? 403 : undefined
        };
      } catch (e) {
        throw new ServerError(`Server internal error`, {
          props: { _place: Gate.constructor.name, _log: String(e) }
        });
      }
    });
    return this;
  }

  async open(thrower?: Thrower): Promise<OpenResult | never> {
    for (const openFn of this.opens) {
      const result = await openFn();
      if (!result.opened) {
        const out: OpenResult = {
          ...result,
          reason: result.reason ? result.reason : "Client error"
        };
        if (thrower) thrower(out);
        return out;
      }
    }
    return {
      opened: true,
      reason: ""
    };
  }

  async openOr(thrower?: Thrower): Promise<OpenResult | never> {
    let out: OpenResult = {
      opened: false,
      reason: ""
    };
    let passed = false;
    for (const openFn of this.opens) {
      const result = await openFn();
      if (passed) break;
      if (result.opened) {
        passed = true;
        out = result;
      } else {
        out = result;
      }
    }
    if (!out.opened && thrower) thrower(out);
    return out;
  }
}
