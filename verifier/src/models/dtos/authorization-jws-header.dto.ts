import { Static, Type } from "@sinclair/typebox";

export const AuthorizationJwsHeader = Type.Object({
  authorization: Type.String({
    description: "Value MUST be 'Bearer <JWS>'. JWS creation process described here: https://github.com/sybil-center/sybil-center/blob/dev/verifier/README.md"
  })
});

export type AuthorizationJwsHeader = Static<typeof AuthorizationJwsHeader>;

