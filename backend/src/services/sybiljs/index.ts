import { CredentialType } from "./types/index.js";


export const sybil = {
  issuerPath(credType: CredentialType) {
    const basePath = `/api/v1/zcred/issuers/${credType}`;
    return new (class PathProvider {
      get challenge() { return `${basePath}/challenge`;}
      get canIssue() { return `${basePath}/can-issue`; }
      get issue() { return `${basePath}/issue`; }
      get info() { return `${basePath}/info`; }
      get updateProofs() { return `${basePath}/update-proofs`; }
      endpoint(domain: string) {
        return new URL(
          basePath,
          domain.endsWith("/") ? domain : `${domain}/`
        );
      }
    })();
  }
};
