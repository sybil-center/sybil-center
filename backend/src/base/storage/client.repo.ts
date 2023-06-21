import { Disposable, tokens } from "typed-inject";
import { MongoDB } from "./mongo-db.js";
import { Collection } from "mongodb";
import { ClientError, ServerError } from "../../backbone/errors.js";
import { objUtil } from "../../util/model.util.js";
import { ILogger } from "../../backbone/logger.js";
import { Config } from "../../backbone/config.js";
import { TableListCache } from "../../util/cache.util.js";

export type ClientEntity = {
  accountId: string;
  restrictionURIs: string[];
  customSchemas: { [key: string]: any }[];
}

export type ClientUpdate = Partial<Omit<ClientEntity, "accountId">>;

export type ClientFindFilter = {
  /** according to {@link https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-10.md} */
  accountId: string;
}

export interface IClientRepo {
  /**
   * Find client entity by filter, else return null
   * @return client entity {@link ClientEntity}
   * @param filter {@link ClientFindFilter}
   */
  find(filter: ClientFindFilter): Promise<ClientEntity | null>;

  /**
   * Find client by filter, else throw {@link ClientError}
   * @return client entity {@link ClientEntity}
   * @param filter {@link ClientFindFilter}
   */
  get(filter: ClientFindFilter): Promise<ClientEntity>;

  /**
   * Create client entity
   * @param client
   */
  create(client: ClientEntity): Promise<ClientEntity>;

  /**
   * Update client entity by filter and others partial client entity props
   * @param filter {@link ClientFindFilter}
   * @param props partial client entity props
   * @return accountId
   */
  update({ accountId }: ClientFindFilter, props: Partial<Omit<ClientEntity, "accountId">>): Promise<ClientEntity>;

  /**
   * Delete client entity by filter
   * @param filter {@link ClientFindFilter}
   */
  delete(filter: ClientFindFilter): Promise<string>;
}

export class ClientRepo implements IClientRepo, Disposable {

  private readonly clients: Collection<ClientEntity>;

  static inject = tokens("mongoDB", "logger");
  constructor(
    private readonly mongoDB: MongoDB,
    private readonly logger: ILogger
  ) {
    this.clients = this.mongoDB.collection<ClientEntity>("clients");
  }

  async find({ accountId }: ClientFindFilter): Promise<ClientEntity | null> {
    try {
      return await this.clients.findOne({ accountId: accountId });
    } catch (e) {
      throw new ServerError("Clients collection findOne method throw error", {
        props: {
          _place: ClientRepo.constructor.name,
          _log: String(e)
        }
      });
    }
  }

  async get(filter: ClientFindFilter): Promise<ClientEntity> {
    const client = await this.find(filter);
    if (!client) {
      throw new ClientError(`Client with accountId=${filter.accountId} is not present`);
    }
    return client;
  }

  async create(client: ClientEntity): Promise<ClientEntity> {
    objUtil.cleanUndefined(client);
    try {
      await this.clients.insertOne(client);
      return client;
    } catch (e) {
      this.logger.error(e);
      throw new ClientError("Could not create client");
    }
  }

  async update({ accountId }: ClientFindFilter, props: Partial<Omit<ClientEntity, "accountId">>): Promise<ClientEntity> {
    objUtil.cleanUndefined(props);
    const result = await this.clients.findOneAndUpdate(
      { accountId },
      { $set: { ...props } },
      { returnDocument: "after" }
    );
    const client = result.value;
    if (client) return client;
    throw new ClientError(`Apikey with accountId=${accountId} not found`);
  }

  async delete({ accountId }: ClientFindFilter): Promise<string> {
    const result = await this.clients.deleteOne({ accountId: accountId });
    if (result.deletedCount === 0) {
      throw new ClientError(`Client with accountId=${accountId} is not present`);
    }
    return accountId;
  }

  async dispose() {
    await this.mongoDB.dispose();
  }
}

export class ClientRepoCached implements IClientRepo, Disposable {

  static inject = tokens(
    "config",
    "mongoDB",
    "logger"
  );
  constructor(
    config: Config,
    mongoDB: MongoDB,
    logger: ILogger,
    private readonly clientRepo = new ClientRepo(mongoDB, logger),
    private readonly cache = config.clientCacheRequired
      ? new TableListCache<ClientEntity>(config.clientCacheSize)
      : undefined
  ) {}

  create(client: ClientEntity): Promise<ClientEntity> {
    return this.clientRepo.create(client);
  }

  async delete(filter: ClientFindFilter): Promise<string> {
    const deletedAccountId = await this.clientRepo.delete(filter);
    if (this.cache) this.cache.delete(deletedAccountId);
    return deletedAccountId;
  }

  async find(filter: ClientFindFilter): Promise<ClientEntity | null> {
    if (!this.cache) return this.clientRepo.find(filter);
    const found = this.cache.find(filter.accountId);
    if (!found) {
      const client = await this.clientRepo.find(filter);
      if (!client) return client;
      this.cache.push(filter.accountId, client);
      return client;
    }
    this.cache.push(filter.accountId, found); // push on top
    return found;
  }

  async get(filter: ClientFindFilter): Promise<ClientEntity> {
    const client = await this.find(filter);
    if (client) return client;
    throw new ClientError(`Client entity with accountId=${filter.accountId} is not present`);
  }

  async update(filter: ClientFindFilter, props: Partial<Omit<ClientEntity, "accountId">>): Promise<ClientEntity> {
    const updated = await this.clientRepo.update(filter, props);
    this.cache?.push(filter.accountId, updated);
    return updated;
  }

  async dispose() {
    this.cache?.clear();
    await this.clientRepo.dispose();
  }
}
