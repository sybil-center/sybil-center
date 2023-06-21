import { tokens } from "typed-inject";
import { type ClientEntity, ClientFindFilter, type IClientRepo } from "../storage/client.repo.js";
import { Credential } from "@sybil-center/sdk";
import { CredentialVerifier } from "./credential-verifivator.js";
import { ICaptchaService } from "./captcha.service.js";
import { credentialUtil } from "../../util/credential.utils.js";
import { Config } from "../../backbone/config.js";
import { ClientError } from "../../backbone/errors.js";

export type ClientUpdateReq = {
  credential: Credential;
  captchaToken?: string;
}

/**
 * Service to manage ClientEntity {@link ClientEntity}
 */
export interface IClientService {

  find(filter: ClientFindFilter): Promise<ClientEntity | null>;

  /**
   * Find client by filter, else throw {@link ClientError}
   * @return client entity {@link ClientEntity}
   * @param filter {@link ClientFindFilter}
   */
  get(filter: ClientFindFilter): Promise<ClientEntity>;

  create(client: ClientEntity): Promise<ClientEntity>;

  /**
   * Update client entity by filter and others partial client entity props
   * @param filter {@link ClientFindFilter}
   * @param props partial client entity props
   * @param requirements
   * @return accountId
   */
  update(
    filter: ClientFindFilter,
    props: Partial<Omit<ClientEntity, "accountId">>,
    requirements?: ClientUpdateReq
  ): Promise<ClientEntity>;

  /**
   * Find client by filter or create client if doesn't present
   * @param filter
   */
  findOrCreate(filter: ClientFindFilter): Promise<ClientEntity>;
}

export class ClientService implements IClientService {

  static inject = tokens(
    "clientRepo",
    "credentialVerifier",
    "captchaService",
    "config"
  );
  constructor(
    private readonly clientRepo: IClientRepo,
    private readonly verifier: CredentialVerifier,
    private readonly captchaService: ICaptchaService,
    private readonly config: Config
  ) {}

  async find(filter: ClientFindFilter): Promise<ClientEntity | null> {
    return this.clientRepo.find(filter);
  }

  async get(filter: ClientFindFilter): Promise<ClientEntity> {
    return this.clientRepo.get(filter);
  }

  async create(client: ClientEntity): Promise<ClientEntity> {
    return this.clientRepo.create(client);
  }

  async update(
    { accountId }: ClientFindFilter,
    props: Partial<Omit<ClientEntity, "accountId">>,
    requirements?: ClientUpdateReq
  ): Promise<ClientEntity> {
    if (requirements) {
      const { credential, captchaToken } = requirements;
      if (accountId !== credentialUtil.extractAccountId(credential)) {
        console.log("should throw");
        throw new ClientError("Credential account Id not matched with session account id");
      }
      await this.validateCredential(credential);
      await this.validateCaptcha(captchaToken);
    }
    return await this.clientRepo.update({ accountId }, props);
  }

  private async validateCredential(credential: Credential): Promise<void> {
    const { valid, reason } = credentialUtil.validate(credential, {
      type: "EthereumAccount",
      ttlRange: this.config.apiKeysCredentialTTL
    });
    if (!valid) throw new ClientError(reason!);
    const { isVerified } = await this.verifier.verify(credential);
    if (!isVerified) {
      throw new ClientError("Credential not verified", 403);
    }
  }

  private async validateCaptcha(captchaToken?: string): Promise<void> {
    if (!captchaToken) return;
    const { isHuman } = await this.captchaService.isHuman(captchaToken, "update");
    if (!isHuman) throw new ClientError("Non human actions are detected");
  }

  async findOrCreate(filter: ClientFindFilter): Promise<ClientEntity> {
    const client = await this.find(filter);
    if (client) return client;
    const clientEntity: ClientEntity = {
      accountId: filter.accountId,
      restrictionURIs: [],
      customSchemas: []
    };
    return await this.create(clientEntity);
  }
}
