import { Config } from "../backbone/config.js";
import { VCCredential } from "./vc/consts/vc-credential.js";
import { VCCredentialVerifier } from "./vc/vc-credential-verifivator.js";
import { FastifyRequest } from "fastify";
import { ThrowDecoder } from "../util/throw-decoder.util.js";
import { ClientErr } from "../backbone/errors.js";
import { vccredUtil, CredOptions } from "../util/credential.utils.js";
import { tokens } from "typed-inject";

export class GateBuilder {
  static inject = tokens(
    "config",
    "vcCredentialVerifier",
  );
  constructor(
    private readonly config: Config,
    private readonly vcCredentialVerifier: VCCredentialVerifier,
  ) {}

  build(): Gate {
    return new Gate(
      this.config,
      this.vcCredentialVerifier,
    );
  }
}

export type OpenResult = {
  readonly opened: boolean;
  readonly reason: string;
  readonly errStatus?: number;
}

type OpenFn = () => Promise<OpenResult>;

type Thrower = (openResult: OpenResult) => never;

class Gate {
  private readonly opens: OpenFn[] = [];

  constructor(
    private readonly config: Config,
    private readonly vcCredentialVerifier: VCCredentialVerifier,
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

  validateVcCredential(credential: VCCredential, option: CredOptions): Gate {
    credential = ThrowDecoder
      .decode(VCCredential, credential, new ClientErr("Invalid credential"));
    this.setLock(async () => {
      const { valid, reason } = vccredUtil.validate(credential, option);
      return {
        opened: valid,
        reason: reason ? reason : "",
        errStatus: 400
      };
    });
    return this;
  }

  verifyCredential(credential: VCCredential): Gate {
    credential = ThrowDecoder
      .decode(VCCredential, credential, new ClientErr("Invalid credential"));
    this.setLock(async () => {
      const { isVerified } = await this.vcCredentialVerifier.verify(credential);
      return {
        opened: isVerified,
        reason: !isVerified ? `Credential is not verified` : "",
        errStatus: !isVerified ? 400 : undefined
      };
    });
    return this;
  }

  /** Check captcha */
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

  /** To open gate all locks MUST be opened */
  async openAll(thrower?: Thrower): Promise<OpenResult | never> {
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

  /** If one lock is opened then gate opens */
  async openOne(thrower?: Thrower): Promise<OpenResult | never> {
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
