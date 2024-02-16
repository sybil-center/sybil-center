import { hash as sha256 } from "@stablelib/sha256";
import { Ed25519Provider } from "key-did-provider-ed25519";
import { DID } from "dids";
import KeyResolver from "key-did-resolver";
import { tokens } from "typed-inject";

export class DIDService {
  static inject = tokens("config");

  private readonly did: DID;
  readonly authenticate: DID["authenticate"];
  readonly createJWS: DID["createJWS"];
  readonly verifyJWS: DID["verifyJWS"];

  #verificationMethod: string | undefined;

  constructor(config: { secret: string }) {
    const secretBytes = Array.from(config.secret, (i) => i.charCodeAt(0));
    const seed = sha256(new Uint8Array(secretBytes));

    const provider = new Ed25519Provider(seed);
    this.did = new DID({
      provider: provider,
      resolver: KeyResolver.getResolver(),
    });
    this.authenticate = this.did.authenticate.bind(this.did);
    this.createJWS = this.did.createJWS.bind(this.did);
    this.verifyJWS = this.did.verifyJWS.bind(this.did);
  }

  get id(): string {
    return this.did.id;
  }

  async init() {
    await this.authenticate();
    const { didDocument } = await this.did.resolve(this.id);
    this.#verificationMethod = didDocument?.verificationMethod?.[0]?.id!;
  }

  get verificationMethod(): string {
    if (!this.#verificationMethod) {
      throw new Error(`Must init first`);
    }
    return this.#verificationMethod;
  }
}
