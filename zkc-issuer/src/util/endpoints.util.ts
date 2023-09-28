import { ZkcSchemaNames } from "../type/index.js";

function schemaToURL(name: ZkcSchemaNames) {
  return name
    .toString()
    .replace(/([a-z0–9])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

const EPs = {
  v1: (schemaName: ZkcSchemaNames) => {
    const baseURL = `/api/v1/zkc/${schemaToURL(schemaName)}`;
    return {
      challenge: `${baseURL}/challenge`,
      canIssue: `${baseURL}/can-issue`,
      issue: `${baseURL}/issue`
    };
  }
};

export { EPs };
