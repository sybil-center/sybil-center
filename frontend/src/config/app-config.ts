export const appConfig = {
  vcProviderUrlApi: new URL(getStrOrThrow("VC_PROVIDER_URL_API")),
  infuraApiKey: getStrOrThrow("INFURA_API_KEY"),
  walletConnectProjectId: getStrOrThrow("WALLET_CONNECT_PROJECT_ID"),
  walletAppName: getStrOrThrow("WALLET_APP_NAME"),
  vcIssuerDomain: new URL(getStrOrThrow("VC_ISSUER_DOMAIN")),
};

function getStrOrThrow(envVar: string): string {
  const fullEnvVar = `REACT_APP_${envVar}`;
  const eVar = process.env[fullEnvVar];
  if (eVar) {
    return eVar;
  }
  throw new Error(`Environment variable are not specified - ${fullEnvVar}`);
}

function getOrElse(envVar: string, elseVar: string): string {
  const targetEnvVar = process.env[`REACT_APP_${envVar}`];
  return targetEnvVar ? targetEnvVar : elseVar;
}
