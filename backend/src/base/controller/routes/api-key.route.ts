import { Route } from "../../types/route.js";
import { generateAPIkeysEP } from "../../../util/route.util.js";
import { credentialSchema } from "../../schemas/credential.schema.js";

export const generateAPIkeysRoute: Route = {
  method: ["POST"],
  url: generateAPIkeysEP(),
  schema: {
    body: credentialSchema
  }
}
