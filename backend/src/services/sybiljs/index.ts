export const sybil = {
  issuerPath(id: string) {
    const basePath = `/issuers/${id}`;
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
