import {
  IZkcIssuer,
  ZkcCanIssueReq,
  ZkcCanIssueResp,
  ZkcChallenge,
  ZkcChallengeReq,
  ZkcIssueReq
} from "../../../base/types/zkc.issuer.js";
import { ZkcId, ZkCredProofed, ZkcSchemaNums } from "../../../base/types/zkc.credential.js";
import { IOAuthCallback } from "../../../base/types/issuer.js";
import { OAuthState } from "../../../base/types/oauth.js";
import { Disposable, tokens } from "typed-inject";
import { Config } from "../../../backbone/config.js";
import { TimedCache } from "../../../base/service/timed-cache.js";
import { absoluteId } from "../../../util/id.util.js";
import { fromIssueMessage, toIssueMessage } from "../../../util/message.util.js";
import { GitHubService } from "../../../base/service/external/github.service.js";
import { ClientError } from "../../../backbone/errors.js";
import { zkc } from "../../../util/zk-credentials.util.js";
import { IZkcSignerManager } from "../../../base/service/signers/zkc.signer-manager.js";
import { IVerifierManager } from "../../../base/service/verifiers/verifier.manager.js";


interface GitChallengeReq extends ZkcChallengeReq {
  readonly redirectUrl?: string;
}

interface GitChallenge extends ZkcChallenge {
  readonly authUrl: string;
}

interface GitSession {
  redirectURL?: URL;
  message: string;
  sbjId: ZkcId;
  code?: string;
}

export class ZkcGithubAccountIssuer
  implements IZkcIssuer<
    GitChallengeReq,
    GitChallenge
  >,
    IOAuthCallback,
    Disposable {

  static inject = tokens(
    "config",
    "signerManager",
    "verifierManager"
  );
  constructor(
    config: Config,
    private readonly signerManager: IZkcSignerManager,
    private readonly verifierManager: IVerifierManager,
    private readonly sessionCache = new TimedCache<string, GitSession>(config.oAuthSessionTtl),
    private readonly githubService = new GitHubService(config)
  ) {}

  async getChallenge({
    sbjId,
    redirectUrl,
    exd
  }: GitChallengeReq): Promise<GitChallenge> {
    const sessionId = absoluteId();
    const redirectURL = redirectUrl
      ? new URL(redirectUrl)
      : undefined;
    const message = toIssueMessage({
      subjectId: sbjId.k,
      type: "GitHubAccount",
      githubProps: { value: ["id"], default: ["id"] },
      expirationDate: exd ? new Date(exd) : undefined
    });
    this.sessionCache.set(sessionId, {
      sbjId: { t: zkc.toId(sbjId.t), k: sbjId.k },
      redirectURL: redirectURL,
      message: message,
    });
    const authURL = this.githubService.getOAuthLink({
      sessionId: sessionId,
      credentialType: "GitHubAccount",
      scope: ["read:user"]
    });
    return {
      sessionId: sessionId,
      message: message,
      authUrl: authURL.href,
    };
  }

  async handleOAuthCallback(
    code: string,
    state: OAuthState
  ): Promise<URL | undefined> {
    const sessionId = state.sessionId;
    const session = this.sessionCache.get(sessionId);
    session.code = code;
    this.sessionCache.set(sessionId, session);
    return session.redirectURL;
  }

  async canIssue({ sessionId }: ZkcCanIssueReq): Promise<ZkcCanIssueResp> {
    const session = this.sessionCache.get(sessionId);
    return { canIssue: Boolean(session?.code) };
  }

  async issue({
    sessionId,
    signature
  }: ZkcIssueReq): Promise<ZkCredProofed> {
    const { message, code, sbjId } = this.sessionCache.get(sessionId);
    if (!code) {
      throw new ClientError("GitHub processing your authorization. Wait!");
    }
    const { expirationDate } = fromIssueMessage(message);
    const verified = await this.verifierManager.verify(sbjId.t, {
      sign: signature,
      msg: message,
      publickey: sbjId.k
    });
    if (!verified) {
      throw new ClientError(`Signature for sessionId = ${sessionId} is not verified`);
    }
    const token = await this.githubService.getAccessToken(code);
    const { id: githubId } = await this.githubService.getUser(token);
    const transSchema = zkc.transSchemas(this.providedSchema)[sbjId.t];
    if (!transSchema) {
      throw new ClientError(`Subject ZKC id with type ${sbjId.t} is not supported`);
    }
    return this.signerManager.signZkCred(sbjId.t, {
        sch: this.providedSchema,
        isd: new Date().getTime(),
        exd: expirationDate ? expirationDate.getTime() : 0,
        sbj: {
          id: sbjId,
          git: { id: githubId }
        }
      }, transSchema
    );
  }

  get providedSchema(): ZkcSchemaNums { return 1;};

  dispose(): void {
    this.sessionCache.dispose();
  }
}
