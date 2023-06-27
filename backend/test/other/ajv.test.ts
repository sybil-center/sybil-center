import { suite } from "uvu";
import Ajv, { JSONSchemaType } from "ajv";
import * as a from "uvu/assert";
import { thrown } from "../support/thrown.support.js";

type Data = {
  foo: number;
  bar?: string;
}

type NewData = {
  name: string;
}

const test = suite("OTHER: ajv tests");

test("should validate schema", async () => {
  const ajv = new Ajv();
  const data: Data = {
    foo: 100,
    bar: "baz",
  };
  const schema: JSONSchemaType<Data> = {
    type: "object",
    properties: {
      foo: { type: "integer" },
      bar: {
        type: "string",
        nullable: true,
      }
    },
    required: ["foo"],
    additionalProperties: false
  };
  const validate = ajv.compile(schema);
  const valid = validate(data);
  a.is(valid, true, "should validate data object");
});

test("should throw error on invalid schema", async () => {
  const ajv = new Ajv();
  const schema: JSONSchemaType<Data> = {
    type: "object",
    properties: {
      foo: { type: "integer" },
      bar: { type: "string", nullable: true },
    },
    required: ["foo"],
    paparam: "test",
    additionalProperties: false
  };
  const isThrown = await thrown(async () => ajv.compile(schema));
  a.is(isThrown, true, "error on validation schema not thrown");
});

test("should validate difference schemas from one Ajv", async () => {
  const ajv = new Ajv();

  const data: Data = {
    foo: 1,
    bar: "hello"
  };
  const newData: NewData = {
    name: "hello"
  };
  const dataSchema: JSONSchemaType<Data> = {
    type: "object",
    properties: {
      foo: { type: "integer" },
      bar: { type: "string", nullable: true },
    },
    required: ["foo"],
    additionalProperties: false
  };
  const newDataSchema: JSONSchemaType<NewData> = {
    type: "object",
    properties: {
      name: { type: "string" }
    },
    required: ["name"]
  };
  const validateData = ajv.compile(dataSchema);
  const validateNewData = ajv.compile(newDataSchema);

  const isDataValid = validateData(data);
  a.is(isDataValid, true, "data not valid");

  const isNewDataValid = validateNewData(newData);
  a.is(isNewDataValid, true, "new data not valid");

  a.is(
    validateData(newData), false,
    "data schema has to be not valid after receive new data as input"
  );
  a.is(
    validateNewData(data), false,
    "new data schema has to not valid after receive data as input"
  );
});

test("should validate schema", async () => {
  const ajv = new Ajv();
  const dataSchema: JSONSchemaType<Data> = {
    type: "object",
    properties: {
      foo: { type: "integer" },
      bar: { type: "string", nullable: true },
    },
    required: ["foo"],
    additionalProperties: false
  };
  const valid = ajv.validateSchema(dataSchema);
  a.is(valid, true, "schema has to valid");

  const invalidSchema = {
    type: "object",
    properties: {
      name: "privet"
    },
    require: "name",
    asdf: 1
  };
  const invalid = ajv.validateSchema(invalidSchema);
  a.is(invalid, false, "invalid schema has to be invalid");
});

test.run();
