import * as mongo from "mongodb";
import { Disposable, tokens } from "typed-inject";

const requiredCollections = [
  "clients"
];

export class MongoDB implements Disposable {

  private readonly client: mongo.MongoClient;
  readonly db: mongo.Db;
  private disposed = false;

  readonly collection: mongo.Db["collection"];

  static inject = tokens(
    "config"
  );
  constructor(private readonly config: { dbURL: string; dbName: string }) {
    this.client = new mongo.MongoClient(config.dbURL);
    this.db = this.client.db(config.dbName);
    this.collection = this.db.collection.bind(this.db);
  }

  async init(): Promise<void> {
    try {
      await this.client.connect();
      this.client;
      const allCollections = await this.db.listCollections()
        .toArray()
        .then((collections) => collections.map(col => col.name));

      requiredCollections.forEach(reqCollection => {
        const includes = allCollections.includes(reqCollection);
        if (!includes) {
          throw new Error(`MongoDB db=${this.config.dbName} not contains required collection: ${reqCollection}`);
        }
      });
    } catch (e: any) {
      throw new Error(`MongoDB initialization error: ${e.message}`);
    }
  }

  async dispose() {
    if (this.disposed) return;
    else {
      await this.client.close();
      this.disposed = true;
    }
  }
}
