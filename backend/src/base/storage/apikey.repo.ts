import { MongoDB } from "./mongo-db.js";
import { Disposable, tokens } from "typed-inject";
import { Collection } from "mongodb";
import { ClientError, ServerError } from "../../backbone/errors.js";
import { Config } from "../../backbone/config.js";
import { TableListCache } from "../../util/cache.util.js";
import { ILogger } from "../../backbone/logger.js";
import { objUtil } from "../../util/model.util.js";

export type ApikeyEntity = {
  accountId: string;
  reqCount: number;
  apikeySalt?: string;
  secretSalt?: string;
  onlySecret?: boolean;
}

type ApikeyEntityUpdate = Partial<Omit<ApikeyEntity, "accountId">>

export type ApikeyFilter = {
  accountId: string
}

/** Apikey repository */
export interface IApikeyRepo extends Disposable {

  /**
   * Find apikey entity by filter, return null if not found
   * @param filter
   */
  find(filter: ApikeyFilter): Promise<ApikeyEntity | null>;

  /**
   * Find apikey entity by filter, throw error if not found
   * @param filter
   */
  get(filter: ApikeyFilter): Promise<ApikeyEntity>;

  /**
   * Update apikey entity by filter and props, if entity not found by filter
   * throw error
   * @param filter
   * @param props
   */
  update(filter: ApikeyFilter, props: ApikeyEntityUpdate): Promise<ApikeyEntity>;

  create(entity: ApikeyEntity): Promise<ApikeyEntity>;

  delete({ accountId }: ApikeyFilter): Promise<string>;

  dispose(): Promise<void>;
}

export class ApikeyRepo implements IApikeyRepo {

  private readonly apikeys: Collection<ApikeyEntity>;

  static inject = tokens("mongoDB", "logger");
  constructor(private readonly mongoDB: MongoDB, private readonly logger: ILogger) {
    this.apikeys = this.mongoDB.collection<ApikeyEntity>("apikeys");
  }

  async find({ accountId }: ApikeyFilter): Promise<ApikeyEntity | null> {
    try {
      return this.apikeys.findOne({ accountId: accountId });
    } catch (e) {
      throw new ServerError("Clients collection findOne method throw error", {
        props: {
          _place: ApikeyRepo.constructor.name,
          _log: String(e)
        }
      });
    }
  }

  async get(filter: ApikeyFilter): Promise<ApikeyEntity> {
    const apikeys = await this.find(filter);
    if (!apikeys) {
      throw new ClientError(`Apikey entity with accountId=${filter.accountId} is not present`);
    }
    return apikeys;
  }

  async update({ accountId }: ApikeyFilter, props: ApikeyEntityUpdate): Promise<ApikeyEntity> {
    objUtil.cleanUndefined(props);
    const result = await this.apikeys.findOneAndUpdate(
      { accountId },
      { $set: { ...props } },
      { returnDocument: "after" }
    );
    const apikey = result.value;
    if (apikey) return apikey;
    throw new ClientError(`Apikey with accountId=${accountId} not found`);
  }

  async create(entity: ApikeyEntity): Promise<ApikeyEntity> {
    try {
      await this.apikeys.insertOne(entity);
      return entity;
    } catch (e) {
      this.logger.error(e);
      throw new ClientError("Could not create apikeys");
    }

  }

  async delete({ accountId }: ApikeyFilter): Promise<string> {
    const result = await this.apikeys.deleteOne({ accountId: accountId });
    if (result.deletedCount === 0) {
      throw new ClientError(`Apikeys with accountId=${accountId} is not present`);
    }
    return accountId;
  }

  async dispose() {
    await this.mongoDB.dispose();
  }
}

export class ApikeyRepoCached implements IApikeyRepo {

  private readonly cache: TableListCache<ApikeyEntity> | undefined;

  static inject = tokens(
    "mongoDB",
    "config",
    "logger"
  );
  constructor(
    mongoDB: MongoDB,
    config: Config,
    logger: ILogger,
    private readonly apikeyRepo = new ApikeyRepo(mongoDB, logger)
  ) {
    this.cache = config.apikeysCacheRequired
      ? new TableListCache<ApikeyEntity>(config.apikeysCacheSize)
      : undefined;
  }

  async find(filter: ApikeyFilter): Promise<ApikeyEntity | null> {
    if (!this.cache) return this.apikeyRepo.find(filter);
    const found = this.cache.find(filter.accountId);
    if (!found) {
      const apikeys = await this.apikeyRepo.find(filter);
      if (!apikeys) return apikeys;
      this.cache.push(filter.accountId, apikeys);
      return apikeys;
    }
    this.cache.push(filter.accountId, found); // put api keys on top
    return found;
  }

  async get(filter: ApikeyFilter): Promise<ApikeyEntity> {
    const apikeys = await this.find(filter);
    if (apikeys) return apikeys;
    throw new ClientError(`Apikey entity with accountId=${filter.accountId} is not present`);
  }

  async update(filter: ApikeyFilter, props: ApikeyEntityUpdate): Promise<ApikeyEntity> {
    const updated = await this.apikeyRepo.update(filter, props);
    this.cache?.push(updated.accountId, updated);
    return updated;
  }

  create(entity: ApikeyEntity): Promise<ApikeyEntity> {
    return this.apikeyRepo.create(entity);
  }

  async delete(filter: ApikeyFilter): Promise<string> {
    const deletedAccountId = this.apikeyRepo.delete(filter);
    if (this.cache) this.cache.delete(filter.accountId);
    return deletedAccountId;
  }

  async dispose() {
    if (this.cache) this.cache.clear();
    await this.apikeyRepo.dispose();
  }

}
