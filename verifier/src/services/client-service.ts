import { tokens } from "typed-inject";
import { ClientStore } from "../stores/client.store.js";
import { ClientEntity, ClientEntityNew } from "../entities/client.entity.js";
import { DbClient } from "../backbone/db-client.js";
import crypto from "node:crypto";
import { Config } from "../backbone/config.js";


export class ClientService {

  private readonly db;
  private readonly key: string;
  private readonly iv: string;

  static inject = tokens("dbClient", "clientStore", "config");
  constructor(
    dbClient: DbClient,
    private readonly clientStore: ClientStore,
    config: Config
  ) {
    this.db = dbClient.db;
    this.key = crypto.createHmac("sha512", `client-service:${config.secret}:key`)
      .update(config.secret)
      .digest("hex")
      .substring(0, 16);
    this.iv = crypto.createHmac("sha512", `client-service:${config.secret}:iv`)
      .update(config.secret)
      .digest("hex")
      .substring(0, 16);
  }

  private encryptData(data: string): string {
    const cipher = crypto.createCipheriv("aes-128-cbc", this.key, this.iv);
    return (
      cipher.update(data, "ascii", "hex") +
      cipher.final("hex")
    );
  }

  private decryptData(cipher: string): string {
    const decipher = crypto.createDecipheriv("aes-128-cbc", this.key, this.iv);
    return (
      decipher.update(cipher, "hex", "ascii") +
      decipher.final("ascii")
    );
  }

  private generateAccessToken(): string {
    // client access token - cat
    const str = `cat:${Buffer.from(crypto.randomBytes(11)).toString("ascii")}`;
    return this.encryptData(str);
  }

  async create(client: ClientEntityNew): Promise<Pick<ClientEntity, "subjectId">> {
    return await this.db.transaction(async (tx) => {
      const found = await this.clientStore.getBySubjectId(client.subjectId, tx);
      if (found) return { subjectId: found.subjectId };
      return await this.clientStore.save(client, tx);
    });
  }

  async getBySubjectId(subjectId: string): Promise<ClientEntity | undefined> {
    return this.clientStore.getBySubjectId(subjectId);
  }

  async setRedirectURL(subjectId: string, url: URL): Promise<ClientEntity> {
    const accessToken = this.generateAccessToken();
    return await this.clientStore.setRedirectURL({
      subjectId: subjectId,
      accessToken: accessToken,
      url: url
    });
  }

  isAccessToken(hex: string): boolean {
    try {
      const decrypted = this.decryptData(hex);
      return (decrypted.startsWith("cat:"));
    } catch (e) {
      return false;
    }
  }

  async findByAccessToken(accessToken: string): Promise<ClientEntity> {
    const isToken = this.isAccessToken(accessToken);
    if (!isToken) throw new Error("Invalid client access token");
    return this.clientStore.findByAccessToken(accessToken);
  }

  async getByAccessToken(accessToken: string): Promise<ClientEntity | undefined> {
    return this.clientStore.getByAccessToken(accessToken)
  }

  async deleteAccessToken(subjectId: string, accessToken: string): Promise<ClientEntity> {
    return await this.clientStore.deleteAccessToken({ subjectId, accessToken })
  }

}