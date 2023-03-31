import { toUrlVCType, type VCType } from "../base/model/const/vc-type.js";

export function issueEP(vcType: VCType): string {
  return `/api/v1/vcs/${toUrlVCType(vcType)}/issue`;
}

export function challengeEP(vcType: VCType): string {
  return `/api/v1/vcs/${toUrlVCType(vcType)}/challenge`;
}

export function canIssueEP(vcType: VCType): string {
  return `/api/v1/vcs/${toUrlVCType(vcType)}/can-issue`;
}

export function oauthCallbackEP(): string {
  return "/api/v1/vcs/oauth2/callback";
}

export function vcOAuthCallbackUrl(pathToExposeDomain: URL): URL {
  return new URL(oauthCallbackEP(), pathToExposeDomain);
}

export function ownerProofEP(vcType: VCType): string {
  return `/api/v1/vcs/${toUrlVCType(vcType)}/owner-proof`
}
