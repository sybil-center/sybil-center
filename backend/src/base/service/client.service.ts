import { tokens } from "typed-inject";
import { type ClientEntity, ClientFindFilter, type IClientRepo } from "../storage/client-repo.js";

/**
 * Service to manage ClientEntity {@link ClientEntity}
 */
export interface IClientService {

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

}

export class ClientService implements IClientService {

  static inject = tokens("clientRepo");
  constructor(private readonly clientRepo: IClientRepo) {}

  async get(filter: ClientFindFilter): Promise<ClientEntity> {
    return this.clientRepo.get(filter);
  }

  async updateOrCreate(filter: ClientFindFilter, props: Omit<ClientEntity, "accountId">): Promise<string> {
    return this.clientRepo.updateOrCreate(filter, props,);
  }

  async update(filter: ClientFindFilter, props: Partial<Omit<ClientEntity, "accountId">>): Promise<string> {
    return this.clientRepo.update(filter, props);
  }
}
