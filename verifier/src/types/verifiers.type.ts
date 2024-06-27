import { JalProgram } from "@jaljs/core";
import { JalTarget, ProvingResult, Selector } from "./index.js";
import { Identifier, JsonZcredException } from "@zcredjs/core";

export type JalProgramInfo<
  TTarget extends JalTarget = JalTarget,
  TLinks extends string = string
> = {
  jalProgram: JalProgram<TTarget, TLinks>;
  proposalComment: string;
}

export type OnExceptionResult<T extends unknown = unknown> = {
  subjectId: Identifier;
  exception: JsonZcredException;
  session: T
}

export type OnSuccessResult<T extends unknown = unknown> = {
  provingResult: ProvingResult;
  subjectId: Identifier;
  session: T;
}

export interface IZcredResultHandler {
  onException(exception: OnExceptionResult): Promise<URL | void>;
  onSuccess(result: OnSuccessResult): Promise<URL>;
}

export type ZcredResultHandlerModule = {
  ZcredResultHandler: {
    new(...args: any[]): IZcredResultHandler;
  }
}

export interface IProposer {
  getAccessToken(): Promise<string | undefined>;
  getSelector(subjectId: Identifier): Promise<Selector>;
  getJalProgram(): Promise<JalProgram>;
  getComment(): Promise<string>;
  getSubjectIdType(): Promise<string>;
}

export type ProposerModule = {
  Proposer: {
    new(...args: any[]): IProposer
  }
}

export interface IJalProvider {
  /** returns JAL program */
  getJalProgram(): Promise<JalProgram>;
  /** return JAL program comment */
  getComment(): Promise<string>;
  /** return subject id type provided for JAL program */
  getIdType(): Promise<string>;
}

export type JalProviderModule = {
  JalProvider: {
    new(...args: any[]): IJalProvider
  }
}