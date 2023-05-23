import { verifyCredential } from "./verify-credential.js";
import { issueEthAccountVC } from "./issue.js";
import { apiKeys } from "./apiKeys.js";

export const appSup = {
  verifyCredential: verifyCredential,
  issueEthAccountVC: issueEthAccountVC,
  apiKeys: apiKeys
}
