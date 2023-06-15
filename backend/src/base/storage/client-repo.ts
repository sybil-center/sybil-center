import { Disposable, tokens } from "typed-inject";
import { MongoDB } from "./mongo-db.js";
import { Collection } from "mongodb";
import { ClientError, ServerError } from "../../backbone/errors.js";

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
   * Update client entity by filter and others client entity props
   * @param filter {@link ClientFindFilter}
   * @param props client entity props without clientId
   * @return accountId
   */
  updateOrCreate(filter: ClientFindFilter, props: Omit<ClientEntity, "accountId">): Promise<string>;

  /**
   * Update client entity by filter and others partial client entity props
   * @param filter {@link ClientFindFilter}
   * @param props partial client entity props
   * @return accountId
   */
  update(filter: ClientFindFilter, props: Partial<Omit<ClientEntity, "accountId">>): Promise<string>;

  /**
   * Delete client entity by filter
   * @param filter {@link ClientFindFilter}
   */
  delete(filter: ClientFindFilter): Promise<string>;
}

export class ClientRepo implements IClientRepo, Disposable {

  private readonly clients: Collection<ClientEntity>;

  static inject = tokens("mongoDB");
  constructor(private readonly mongoDB: MongoDB) {
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


  async updateOrCreate({ accountId }: ClientFindFilter, props: Omit<ClientEntity, "accountId">): Promise<string> {
    try {
      await this.clients.updateOne(
        { accountId: accountId },
        {
          $set: {
            ...props
          },
        },
        { upsert: true }
      );
      return accountId;
    } catch (e) {
      throw new ServerError("Client collection update method throw error", {
        props: {
          _place: ClientRepo.constructor.name,
          _log: String(e)
        }
      });
    }
  }

  async update({ accountId }: ClientFindFilter, props: Partial<Omit<ClientEntity, "accountId">>): Promise<string> {
    try {
      const result = await this.clients.updateOne(
        { accountId: accountId },
        {
          $set: {
            restrictionURIs: props.restrictionURIs,
            customSchemas: props.customSchemas
          }
        }
      );
      if (result.modifiedCount === 0) {
        throw new ClientError(`Client with accountId=${accountId} is not present`);
      }
      return accountId;
    } catch (e) {
      if (e instanceof ClientError) throw e;
      throw new ServerError("Client collection part update throw error", {
        props: {
          _place: ClientRepo.constructor.name,
          _log: String(e)
        }
      });
    }
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
