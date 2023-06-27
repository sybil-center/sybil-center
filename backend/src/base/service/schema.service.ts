import Ajv, { type JSONSchemaType } from "ajv";

type ValidResult = {
  isValid: boolean;
  reason: string;
}

export interface ISchemaService {

}

export class SchemaService {
  constructor(private readonly ajv = new Ajv()) {}

  validateSchema<TData = any>(schema: JSONSchemaType<TData>): ValidResult {
    const isValid = this.ajv.validateSchema(schema) as boolean;
    return {
      isValid,
      reason: isValid ? "" : `Schema not valid: ${JSON.stringify(schema)}`
    };
  }

  validate<TData = any>(
    schema: JSONSchemaType<TData>,
    data: TData
  ): ValidResult {
    try {
      const validate = this.ajv.compile(schema);
      const validated = validate(data);
      return {
        isValid: validated,
        reason: validated
          ? ""
          : `Data: '${JSON.stringify(data)}' is not valid for schema:${JSON.stringify(schema)}`
      };
    } catch (e) {
      return {
        isValid: false,
        reason: String(e)
      };
    }
  }
}
