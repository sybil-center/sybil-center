import type {
  CanIssueReq,
  CanIssueRes,
  ICredentialIssuer,
  IOAuthCallback,
  VC
} from "../../../../base/credentials.js";
import {
  DEFAULT_CREDENTIAL_CONTEXT,
  DEFAULT_CREDENTIAL_TYPE
} from "../../../../base/credentials.js";
import { Disposable, tokens } from "typed-inject";
import { DiscordService, type DiscordUser } from "../../discord.service.js";
import { IProofService } from "../../../../base/service/proof-service.js";
import { DIDService } from "../../../../base/service/did-service.js";
import { VCType } from "../../../../base/model/const/vc-type.js";
import { ClientError } from "../../../../backbone/errors.js";
import type {
  IMultiSignService,
  SignAlgAlias
} from "../../../../base/service/multi-sign.service.js";
import { fromIssueChallenge, toIssueChallenge } from "../../../../util/challenge.util.js";
import { TimedCache } from "../../../../base/timed-cache.js";
import { absoluteId } from "../../../../util/id-util.js";
import sortKeys from "sort-keys";
import { OAuthState } from "../../../../base/oauth.js";

export type DiscordOAuthSession = {
  redirectUrl?: URL;
  issueChallenge: string;
  code?: string;
};

export interface DiscordAccOwnershipVC extends VC {
  credentialSubject: {
    id: string;
    discord: {
      id: string;
      username: string;
      discriminator: string;
    };
    custom?: { [key: string]: any };
  };
}

type DiscordAccOwnershipRequest = {
  sessionId: string;
  signAlg?: SignAlgAlias;
  publicId: string;
  signature: string;
};

type DiscordAccOwnershipPayloadRequest = {
  body: {
    custom?: object;
    redirectUrl?: string;
  };
};

export type DiscordAccOwnershipPayload = {
  authUrl: string;
  sessionId: string;
  issueChallenge: string;
};

export function getDiscordAccOwnVC(
  issuer: string,
  didPkh: string,
  { id, username, discriminator }: DiscordUser,
  custom?: object
): DiscordAccOwnershipVC {
  return sortKeys(
    {
      "@context": [DEFAULT_CREDENTIAL_CONTEXT],
      type: [DEFAULT_CREDENTIAL_TYPE, VCType.DiscordAccount],
      issuer: { id: issuer },
      credentialSubject: {
        id: didPkh,
        discord: {
          id: id,
          username: username,
          discriminator: discriminator
        },
        custom: custom
      },
      issuanceDate: new Date()
    },
    { deep: true }
  );
}

export class DiscordAccountIssuer
  implements ICredentialIssuer<
    DiscordAccOwnershipRequest,
    VC,
    DiscordAccOwnershipPayloadRequest,
    DiscordAccOwnershipPayload,
    CanIssueReq,
    CanIssueRes
  >,
    IOAuthCallback,
    Disposable {
  static inject = tokens("multiSignService", "proofService", "didService", "config");

  readonly discordService: DiscordService;
  private readonly sessionCache: TimedCache<string, DiscordOAuthSession>;

  constructor(
    private readonly multiSignService: IMultiSignService,
    private readonly proofService: IProofService,
    private readonly didService: DIDService,
    config: {
      oAuthSessionTtl: number;
      pathToExposeDomain: URL;
      discordClientId: string;
      discordClientSecret: string;
    }
  ) {
    this.discordService = new DiscordService(config);
    this.sessionCache = new TimedCache(config.oAuthSessionTtl);
  }

  async getChallenge({
    body
  }: DiscordAccOwnershipPayloadRequest): Promise<DiscordAccOwnershipPayload> {
    const custom = body?.custom;
    const redirectUrl = body?.redirectUrl
      ? new URL(body?.redirectUrl)
      : undefined;

    const issueChallenge = toIssueChallenge(this.getProvidedVC(), custom);
    const sessionId = absoluteId();
    this.sessionCache.set(sessionId, {
      redirectUrl: redirectUrl,
      issueChallenge: issueChallenge
    });
    const authUrl = this.discordService.getOAuthLink({
      sessionId: sessionId,
      vcType: this.getProvidedVC(),
      scope: ["identify"]
    });
    return {
      sessionId: sessionId,
      authUrl: authUrl.href,
      issueChallenge: issueChallenge
    };
  }


  async handleOAuthCallback(
    code: string, state: OAuthState
  ): Promise<URL | undefined> {
    const sessionId = state.sessionId;
    const session = this.sessionCache.get(sessionId);
    if (!session) throw new ClientError(`No session with id = ${sessionId}`);
    session.code = code;
    this.sessionCache.set(sessionId, session);
    return session.redirectUrl;
  }

  async canIssue({ sessionId }: CanIssueReq): Promise<CanIssueRes> {
    const session = this.sessionCache.get(sessionId);
    return { canIssue: Boolean(session?.code) };
  }

  async issue({
    sessionId,
    signAlg,
    publicId,
    signature
  }: DiscordAccOwnershipRequest): Promise<VC> {
    const session = this.sessionCache.get(sessionId);
    const { code, issueChallenge } = session;
    if (!code) {
      throw new ClientError("Discord processing your authorization. Wait!");
    }
    const did = await this.multiSignService
      .signAlg(signAlg)
      .did(signature, issueChallenge, publicId);

    const { custom } = fromIssueChallenge(issueChallenge);
    const accessToken = await this.discordService.getAccessToken(code);
    const discordUser = await this.discordService.getUser(accessToken);
    this.sessionCache.delete(sessionId);
    const credential = getDiscordAccOwnVC(
      this.didService.id,
      did,
      discordUser,
      custom
    );
    return this.proofService.jwsSing(credential);
  }

  getProvidedVC(): VCType {
    return VCType.DiscordAccount;
  }

  dispose(): void {
    this.sessionCache.dispose();
  }
}
