import { tokens } from "typed-inject";
import { type ClientEntity, ClientFindFilter, type IClientRepo } from "../storage/client.repo.js";
import { Credential } from "@sybil-center/sdk";
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
   * @return accountId
   */
  update(
    filter: ClientFindFilter,
    props: Partial<Omit<ClientEntity, "accountId">>,
  ): Promise<ClientEntity>;

  /**
   * Find client by filter or create client if doesn't present
   * @param filter
   */
  findOrCreate(filter: ClientFindFilter): Promise<ClientEntity>;
}

export class ClientService implements IClientService {

  static inject = tokens("clientRepo",);
  constructor(private readonly clientRepo: IClientRepo) {}

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
  ): Promise<ClientEntity> {
    return await this.clientRepo.update({ accountId }, props);
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
