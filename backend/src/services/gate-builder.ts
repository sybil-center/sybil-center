import { Config } from "../backbone/config.js";
import { FastifyRequest } from "fastify";
import { Injector, INJECTOR_TOKEN, tokens } from "typed-inject";

type GateDependency = {
  config: Config
}

export class GateBuilder {
  static inject = tokens(
    INJECTOR_TOKEN
  );
  constructor(
    private readonly context: Injector<GateDependency>,
  ) {}

  build(): Gate {
    return new Gate(
      this.context
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
    private readonly context: Injector<GateDependency>
  ) {}

  setLock(openFn: OpenFn): Gate {
    this.opens.push(openFn);
    return this;
  }

  checkFrontend(req: FastifyRequest): Gate {
    this.setLock(async () => {
      const frontendDomain = this.context.resolve("config").frontendOrigin.origin;
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

  /** Check captcha */
  captchaRequired(captcha?: string): Gate {
    this.setLock(async () => {
      if (this.context.resolve("config").captchaRequired && !captcha) return {
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
