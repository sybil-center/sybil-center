import { TrSchema } from "trgraph";
import { O1GraphLink } from "o1js-trgraph";
import { HttpCredential, StrictAttributes } from "@zcredjs/core";


export type FarcasterUserAttributes = StrictAttributes & {
  subject: {
    /** farcaster id */
    fid: string;
    followingCount: number;
    followerCount: number;
    custodyAddress: string;
    verifiedAddress: string;
    username: string;
    displayName: string;
    /** registered at date as ISO date & time */
    registeredAt: string;
  };
};

export type FarcasterUserCred = HttpCredential<FarcasterUserAttributes>;

export const o1jsEthTransSchema: TrSchema<O1GraphLink> = {
  type: ["ascii-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"],
  issuanceDate: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
  validFrom: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
  validUntil: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"],
  subject: {
    id: {
      type: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"],
      key: ["0xhex-bytes", "bytes-uint", "uint-mina:field"]
    },
    fid: ["ascii-uint", "mina:mod.order", "uint-mina:field"],
    followingCount: ["uint128-mina:field"],
    followerCount: ["uint128-mina:field"],
    custodyAddress: ["0xhex-bytes", "bytes-uint", "uint-mina:field"],
    verifiedAddress: ["0xhex-bytes", "bytes-uint", "uint-mina:field"],
    username: ["utf8-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"],
    displayName: ["utf8-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"],
    registeredAt: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"]
  }
};

export const ATTRIBUTE_DEFINITION = {
  type: "credential type",
  issuanceDate: "credential issuance date",
  validFrom: "credential valid from date",
  validUntil: "credential valid until date",
  subject: {
    id: {
      type: "credential owner public key type",
      key: "credential owner public key"
    },
    fid: "farcaster ID",
    followingCount: "following count",
    followerCount: "followers count",
    custodyAddress: "farcaster custody address",
    verifiedAddress: "farcaster verified address",
    username: "farcaster username",
    displayName: "farcaster display name",
    registeredAt: "registration date"
  }
};
