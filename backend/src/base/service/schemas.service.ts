import Ajv, { type JSONSchemaType } from "ajv";

type ValidResult = {
  isValid: boolean;
  reason: string;
}

export interface ISchemasService {

  validateSchema(schema: { [key: string]: any }): ValidResult;

  validate<TData = any>(
    schema: JSONSchemaType<TData>,
    data: TData
  ): ValidResult;
}

export class SchemasService implements ISchemasService {
  private readonly ajv
  constructor() {
    this.ajv = new Ajv()
  }

  validateSchema(schema: { [key: string]: any }): ValidResult {
    const isValid = this.ajv.validateSchema(schema) as boolean;
    return {
      isValid,
      reason: isValid ? "" : `Schema not valid: ${JSON.stringify(schema)}`
    };
  }

  validate<TData = any>(
    schema: { [key: string]: any },
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
