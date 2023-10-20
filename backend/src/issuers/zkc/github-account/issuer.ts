import { IssuerTypes, IZkcIssuer, ZkcChallenge, ZkcChallengeReq } from "../../../base/types/zkc.issuer.js";
import { Proved, ZkcId, ZkCred, ZkcSchemaNums } from "../../../base/types/zkc.credential.js";
import { IOAuthCallback } from "../../../base/types/issuer.js";
import { OAuthState } from "../../../base/types/oauth.js";
import { Disposable, tokens } from "typed-inject";
import { Config } from "../../../backbone/config.js";
import { TimedCache } from "../../../base/service/timed-cache.js";
import { absoluteId } from "../../../util/id.util.js";
import { fromIssueMessage, toIssueMessage } from "../../../util/message.util.js";
import { GitHubService } from "../../../base/service/external/github.service.js";
import { ClientError } from "../../../backbone/errors.js";
import { IZkcSignerManager } from "../../../base/service/signers/zkc.signer-manager.js";
import { IVerifierManager } from "../../../base/service/verifiers/verifier.manager.js";
import { ZKC } from "../../../util/zk-credentials/index.js";


export interface GitChallengeReq extends ZkcChallengeReq {
  readonly redirectUrl?: string;
}

export interface GitChallenge extends ZkcChallenge {
  readonly authUrl: string;
}

export type ZkGithubCred = ZkCred<{ git: { id: number } }>

interface GitSession {
  redirectURL?: URL;
  message: string;
  subjectId: ZkcId;
  code?: string;
  opt?: Record<string, any>;
}

interface Ts extends IssuerTypes {
  ChallengeReq: GitChallengeReq;
  Challenge: GitChallenge;
  Cred: Proved<ZkCred<{ git: { id: number } }>>;
}

export class ZkcGitHubAccountIssuer
  implements IZkcIssuer<Ts>,
    IOAuthCallback,
    Disposable {

  static inject = tokens(
    "config",
    "zkcSignerManager",
    "verifierManager"
  );
  constructor(
    config: Config,
    private readonly signerManager: IZkcSignerManager,
    private readonly verifierManager: IVerifierManager,
    private readonly sessionCache = new TimedCache<string, GitSession>(config.oAuthSessionTtl),
    private readonly githubService = new GitHubService(config)
  ) {}

  get providedSchema(): ZkcSchemaNums { return 1;};

  async getChallenge({
      subjectId,
      redirectUrl,
      expirationDate,
      options
    }: Ts["ChallengeReq"]
  ): Promise<Ts["Challenge"]> {
    const sessionId = absoluteId();
    const redirectURL = redirectUrl
      ? new URL(redirectUrl)
      : undefined;
    const message = toIssueMessage({
      subjectId: subjectId.k,
      type: "GitHubAccount",
      githubProps: { value: ["id"], default: ["id"] },
      expirationDate: expirationDate ? new Date(expirationDate) : undefined
    });
    this.sessionCache.set(sessionId, {
      subjectId: subjectId,
      redirectURL: redirectURL,
      message: message,
      opt: options
    });
    const authURL = this.githubService.getOAuthLink({
      sessionId: sessionId,
      credentialType: "GitHubAccount",
      scope: ["read:user"],
      isZKC: true
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

  async canIssue({ sessionId }: Ts["CanIssueReq"]): Promise<Ts["CanIssueResp"]> {
    const session = this.sessionCache.get(sessionId);
    return { canIssue: Boolean(session?.code) };
  }

  async issue({
      sessionId,
      signature
    }: Ts["IssueReq"]
  ): Promise<Proved<ZkGithubCred>> {
    const { message, code, subjectId, opt } = this.sessionCache.get(sessionId);
    if (!code) {
      throw new ClientError("GitHub processing your authorization. Wait!");
    }
    this.sessionCache.delete(sessionId);
    const { expirationDate } = fromIssueMessage(message);
    const verified = await this.verifierManager.verify(subjectId.t, {
      sign: signature,
      msg: message,
      publickey: subjectId.k
    }, opt);
    if (!verified) {
      throw new ClientError(`Signature for sessionId = ${sessionId} is not verified`);
    }
    const token = await this.githubService.getAccessToken(code);
    const { id: githubId } = await this.githubService.getUser(token);
    // @ts-ignore
    const transSchema = ZKC.transSchemas[subjectId.t][this.providedSchema];
    if (!transSchema) {
      throw new ClientError(`Subject ZKC id with type ${subjectId.t} is not supported`);
    }
    return this.signerManager.signZkCred<ZkGithubCred>(subjectId.t, {
        sch: this.providedSchema,
        isd: new Date().getTime(),
        exd: expirationDate ? expirationDate.getTime() : 0,
        sbj: {
          id: subjectId,
          git: { id: githubId },
        }
      }, transSchema
    );
  }

  async dispose() {
    this.sessionCache.dispose();
  }
}
