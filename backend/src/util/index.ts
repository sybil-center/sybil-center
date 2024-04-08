import fs from "node:fs";
import { HttpIssuerControllerModule, IHttpIssuerController, IIssuer, IssuerModule } from "../types/issuer.js";

const _rootdir = new URL(`../`, import.meta.url).href;

export const ROOT_DIR = _rootdir.endsWith("/")
  ? new URL(_rootdir)
  : new URL(`${_rootdir}/`);

export const ISSUERS_DIR = new URL(`./issuers/`, ROOT_DIR);

const issuerIds: string[] = [];

export function getIssuerIds(): string[] {
  if (issuerIds.length === 0) {
    fs.readdirSync(ISSUERS_DIR, { withFileTypes: true })
      .filter((it) => it.isDirectory())
      .map((it) => it.name)
      .forEach((id) => issuerIds.push(id));
    return issuerIds;
  }
  return issuerIds;
}

export async function getIssuerConstructorMap(): Promise<Map<string, { new(...args: any[]): IIssuer }>> {
  const map = new Map<string, { new(...args: any[]): IIssuer }>([]);
  const ids = getIssuerIds();
  for (const id of ids) {
    let path = new URL(`./${id}/issuer.js`, ISSUERS_DIR);
    if (!fs.existsSync(path)) {
      path = new URL(`./${id}/issuer.ts`, ISSUERS_DIR);
    }
    if (fs.existsSync(path)) {
      try {
        const { Issuer } = await import(path.href) as IssuerModule;
        map.set(toIssuerToken(id), Issuer);
      } catch (e) {
        throw new Error(`Can not initialize issuer with id: ${id} by path ${path.href}`);
      }
    } else {
      throw new Error(`Can not find issuer with id: ${id} by path ${path.href}`);
    }
  }
  const keys = Array.from(map.keys());
  for (const token of ids.map(toIssuerToken)) {
    if (!keys.includes(token)) {
      throw new Error(`Issuer with id: ${token}, not initialized`);
    }
  }
  return map;
}

export function toIssuerToken(issuerId: string): string {
  const camelCase = issuerId.replace(/-./g, x=>x[1]!.toUpperCase())
  return `${camelCase}Issuer`;
}

export async function getHttpIssuerControllerConstructorMap(): Promise<Map<string, {
  new(...args: any[]): IHttpIssuerController
}>> {
  const map = new Map<string, { new(...args: any[]): IHttpIssuerController }>([]);
  const ids = getIssuerIds();
  for (const id of ids) {
    let path = new URL(`./${id}/http-controller.js`, ISSUERS_DIR);
    if (!fs.existsSync(path)) {
      path = new URL(`./${id}/http-controller.ts`, ISSUERS_DIR);
    }
    if (fs.existsSync(path)) {
      try {
        const { HttpIssuerController } = await import(path.href) as HttpIssuerControllerModule;
        map.set(toHttpIssuerControllerToken(id), HttpIssuerController);
      } catch (e) {
        throw new Error(`Can not initialize http issuer controller with id: ${id} by path ${path.href}`);
      }
    } else {
      throw new Error(`Can not find http issuer controller with id: ${id} by path ${path.href}`);
    }
  }
  const keys = Array.from(map.keys());
  for (const token of ids.map(toHttpIssuerControllerToken)) {
    if (!keys.includes(token)) {
      throw new Error(`Http issuer controller with id: ${token}, not initialized`);
    }
  }
  return map;
}

export function toHttpIssuerControllerToken(id: string): string {
  const camelCase = id.replace(/-./g, x=>x[1]!.toUpperCase())
  return `${camelCase}HttpIssuerController`;
}
