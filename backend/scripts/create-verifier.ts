import fs from "node:fs";

type CreateVerifierInfo = {
  id: string;
  subjectIdType: string;
  issuer: {
    type: string;
    uri: URL;
  };
}

const createInfo = {
  /** Verifier id*/
  id: "new-verifier",
  /** Write subject id type according ZCIP-2 https://github.com/zcred-org/ZCIPs/blob/main/ZCIPs/zcip-2.md */
  subjectIdType: "mina:publickey",
  /** Issuer information */
  issuer: {
    type: "http", // now only "http"
    uri: new URL("https://zcred-issuers.com/new-verifier/")
  }
} satisfies CreateVerifierInfo;


function createVerifier() {
  try {
    const verifiersDir = new URL(`../src/verifiers/`, import.meta.url);
    if (!fs.existsSync(verifiersDir) || !fs.lstatSync(verifiersDir).isDirectory()) {
      throw new Error(`Directory: ${verifiersDir.href} not exists`);
    }
    const newVerifierDir = new URL(`./${createInfo.id}/`, verifiersDir);
    if (fs.existsSync(newVerifierDir)) throw new Error(
      `Verifier with id "${createInfo.id}" already exists. Directory path: ${newVerifierDir.href}`
    );
    fs.mkdirSync(newVerifierDir);
    fs.writeFileSync(
      new URL(`./proposer.ts`, newVerifierDir),
      proposerTemplate
    );
    fs.writeFileSync(
      new URL(`./zcred-result-handler.ts`, newVerifierDir),
      resultHandlerTemplate
    );
    console.log(`Verifier with id "${createInfo.id}" has been created`);
  } catch (e: any) {
    console.log(`Can not create verifier. Error message: ${e.message}`);
  }
}

const proposerTemplate = `import { IProposer } from "../../types/verifiers.type.js";
import { Selector } from "../../types/index.js";
import { Identifier, IdType } from "@zcredjs/core";
import { JalProgram } from "@jaljs/core";

export class Proposer implements IProposer {

  getSubjectIdType(): Promise<IdType> {
    return Promise.resolve("${createInfo.subjectIdType}");
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
          type: "${createInfo.issuer.type}",
          uri: new URL("${createInfo.issuer.uri.href}").href
        }
      }
    });
  }

  getAccessToken(): Promise<string | undefined> {
    // get access token from issuer if necessary
    return Promise.resolve(undefined);
  }

  getComment(): Promise<string> {
    // TODO: Write JAL program comment
    return Promise.resolve("");
  }

  getJalProgram(): Promise<JalProgram> {
    // TODO: Write JAL program
    throw new Error("Implement !!!")
  }
}
`;

const resultHandlerTemplate = `import { IZcredResultHandler, OnExceptionResult, OnSuccessResult } from "../../types/verifiers.type.js";

export class ZcredResultHandler implements IZcredResultHandler {

  constructor() {}

  async onException({ subjectId, exception }: OnExceptionResult): Promise<URL | void> {
    // TODO: Write logic on exception case
    throw new Error("Implement !!!");
  }

  async onSuccess({
    subjectId,
    provingResult
  }: OnSuccessResult): Promise<URL> {
    // TODO: Write logic on success case
    throw new Error("Implement !!!");
  }
}
`;

createVerifier();