import { IProposer } from "../../types/verifiers.type.js";
import { Selector } from "../../types/index.js";
import { Identifier, IdType } from "@zcredjs/core";
import { jalProgramInfo } from "./jal-program.js";
import { JalProgram } from "@jaljs/core";

export class Proposer implements IProposer {

  getSubjectIdType(): Promise<IdType> {
    return Promise.resolve("ethereum:address");
  }

  getSelector(subjectId: Identifier): Promise<Selector> {
    return Promise.resolve({
      attributes: {
        subject: {
          id: subjectId
        }
      },
      meta: {
        issuer: {
          type: "http",
          uri: new URL("https://api.dev.sybil.center/issuers/farcaster-user/").href
        }
      }
    });
  }

  getAccessToken(): Promise<string | undefined> {
    return Promise.resolve(undefined);
  }

  getComment(): Promise<string> {
    return Promise.resolve("If you are under 18 years old you will not pass authentication");
  }

  getJalProgram(): Promise<JalProgram> {
    return Promise.resolve(jalProgramInfo.jalProgram);
  }
}