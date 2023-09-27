import { suite } from "uvu";
import * as a from "uvu/assert";
import { configDotEnv } from "../../../../src/util/dotenv.util.js";
import { support } from "../../../support/index.js";
import { Config } from "../../../../src/backbone/config.js";
import { ZkcGitHubAccountIssuer } from "../../../../src/issuers/zkc/github-account/issuer.js";
import { ZkcSignerManager } from "../../../../src/base/service/signers/zkc.signer-manager.js";
import { VerifierManager } from "../../../../src/base/service/verifiers/verifier.manager.js";
import { stub } from "sinon";
import { TimedCache } from "../../../../src/base/service/timed-cache.js";
import { GitHubService } from "../../../../src/base/service/external/github.service.js";
import Client from "mina-signer";
import { Field, Poseidon, PrivateKey, PublicKey, Scalar, Signature } from "snarkyjs";
import { Zkc } from "../../../../src/util/zk-credentials/index.js";

const test = suite(`INTEGRATION: test Github Account ZKC issuer`);

const accessToken = "token";
const redirectURL = "https://example.com/";
const githubUser = {
  username: "username",
  id: 1337,
  userPage: "https://github/username",
};
let issuer: ZkcGitHubAccountIssuer;
let config: Config;

test.before(async () => {
  configDotEnv({ path: support.configPath, override: true });
  config = new Config();
  const githubService = new GitHubService(config);
  issuer = new ZkcGitHubAccountIssuer(
    config,
    new ZkcSignerManager(config),
    new VerifierManager(),
    // @ts-ignore
    new TimedCache(),
    githubService
  );

  stub(githubService, "getAccessToken").resolves(accessToken);
  stub(githubService, "getUser").resolves(githubUser);
});

test.after(async () => {
  issuer.dispose();
});

test("Issue & verify credential", async () => {
  const client = new Client({ network: "mainnet" });
  const sbjPrivkey = PrivateKey.fromBase58("EKFaFAx6LmKZvb1LvUiT2m9JVwcnquq8UL8M5N8c1ETY8aKB9F7X");
  const sbjPubkey = sbjPrivkey.toPublicKey();
  // const exd = new Date();
  const { message, sessionId } = await issuer.getChallenge({
    subjectId: {
      t: Zkc.idType.fromAlias("mina"),
      k: sbjPubkey.toBase58()
    },
    expirationDate: new Date().getTime() - 10000000000,
    // exd: exd.getTime(),
    redirectUrl: redirectURL
  });
  const redirectTo = await issuer.handleOAuthCallback("simple_code", {
    sessionId: sessionId,
    isZKC: true,
    credentialType: "GitHubAccount"
  });
  a.is(redirectTo?.href, redirectURL, `redirect url is not matched after oauth callback handle`);
  const {
    signature: {
      field,
      scalar
    }
  } = client.signMessage(message, sbjPrivkey.toBase58());
  const sign = Signature.fromObject({
    r: Field.fromJSON(field),
    s: Scalar.fromJSON(scalar)
  }).toBase58();
  const credProofed = await issuer.issue({
    sessionId: sessionId,
    signature: sign
  });

  const proof = credProofed.proof[0]!;
  //@ts-ignore
  credProofed.proof = undefined;
  const prepared = Zkc.preparator.prepare<Field[]>(credProofed, proof.transformSchema);
  const msg = Poseidon.hash(prepared);
  const signature = Signature.fromBase58(proof.sign);
  const verified = signature.verify(PublicKey.fromBase58(proof.key), [msg]);
  a.is(verified.toJSON(), true, `Signature is not verified`);

});

test.run();
