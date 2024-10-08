export const VERIFIER_STATEMENT = {
  CREATE_JAL: "create-jal-program",
  GET_PROPOSAL: "get-proposal",
  GET_VERIFICATION_RESULT: "get-verification-result",
  CREATE_SESSION: "create-session"
} as const;

export type VerifierStatement = typeof VERIFIER_STATEMENT[keyof typeof VERIFIER_STATEMENT];

export function isVerifierStatement(input: string): input is VerifierStatement {
  // @ts-expect-error
  return Object.values(VERIFIER_STATEMENT).includes(input);
}