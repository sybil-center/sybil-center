import { tokens } from "typed-inject";
import { Config } from "../backbone/config.js";
import { ServerErr } from "../backbone/errors.js";

export type FarquestType = {
  User: UserResp
}

type UserResp = {
  result: {
    user: {
      fid: string;
      followingCount: number;
      followerCount: number;
      pfp: {
        url: string;
        verified: boolean;
      },
      bio: {
        text: string;
        mentions: unknown[];
      },
      external: boolean;
      custodyAddress: string;
      connectedAddress: string;
      allConnectedAddresses: {
        ethereum: string[];
        solana: string[]
      },
      username: string;
      displayName: string;
      registeredAt: number;
    }
  };
  source: string;
}

type NoUserResp = {
  result: {
    user: null;
  },
  source: string;
}

function isNoUserResp(o: unknown): o is NoUserResp {
  return (
    typeof o === "object" && o !== null &&
    "result" in o && typeof o.result === "object" && o.result !== null &&
    "user" in o.result && o.result.user === null &&
    "source" in o && typeof o.source === "string"
  );
}

/**
 * Farcaster API provider
 */
export class FarquestService {

  private readonly apiKey: string;

  static inject = tokens("config");
  constructor(config: Config) {
    this.apiKey = config.farquestApiKey;

    this.getUserByVerifiedAddress = this.getUserByVerifiedAddress.bind(this);
    this.getUserByCustodyAddress = this.getUserByCustodyAddress.bind(this);
  }

  /**
   * get user information by Verified Address
   * @param address ETH address
   */
  async getUserByVerifiedAddress(address: string): Promise<UserResp | null> {
    const url = new URL("https://build.far.quest/farcaster/v2/user-by-connected-address");
    url.searchParams.set("address", address);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "API-KEY": this.apiKey
      }
    });
    if (response.ok) {
      const json: UserResp | NoUserResp = await response.json();
      if (isNoUserResp(json)) return null;
      return json;
    } else {
      throw new ServerErr({
        place: this.constructor.name,
        message: "Farcaster provider no working now",
        description: `Method: getUserByVerifiedAddress. URL: ${url.href}, method: GET, status: ${response.status}, body: ${await response.text()}`
      });
    }
  }

  /**
   * get Farcaster user information by custody address
   * @param address ETH address
   */
  async getUserByCustodyAddress(address: string): Promise<UserResp | null> {
    const url = new URL("https://build.far.quest/farcaster/v2/user-by-custody-address");
    url.searchParams.set("address", address);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        "API-KEY": this.apiKey
      }
    });
    if (response.ok) {
      const json: UserResp | NoUserResp = await response.json();
      if (isNoUserResp(json)) return null;
      return json;
    } else {
      throw new ServerErr({
        place: this.constructor.name,
        message: "Farcaster provider no working now",
        description: `Method: getUserByCustodyAddress. URL: ${url.href}, method: GET, status: ${response.status}, body: ${await response.text()}`
      });
    }
  }


}
