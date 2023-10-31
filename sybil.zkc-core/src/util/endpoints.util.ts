import { SchemaName } from "../schemas.js";

const EPs = {
  v1: (schemaName: SchemaName) => {
    const baseURL = `/api/v1/zkc/${schemaName}`;
    return {
      challenge: `${baseURL}/challenge`,
      canIssue: `${baseURL}/can-issue`,
      issue: `${baseURL}/issue`
    };
  }
};

export { EPs };
