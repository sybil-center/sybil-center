export const schemas = [0] as const;
export type Schema = typeof schemas[number];

export const schemaNames = ["passport"] as const;
export type SchemaName = typeof schemaNames[number];

export function isSchema(num: number): num is Schema {
  return schemas
    // @ts-ignore
    .includes(num);
}

export function isSchemaName(name: string): name is SchemaName {
  return schemaNames
    // @ts-ignore
    .includes(name);
}

const schemaMap: Record<Schema, SchemaName> = {
  0: "passport"
};

const nameSchemaMap: Record<SchemaName, Schema> = {
  passport: 0
};

export function toSchema(name: string | number): Schema {
  if (typeof name === "number") {
    if (isSchema(name)) return name;
    else throw new Error(`${name} is not schema`);
  } else {
    if (isSchemaName(name)) return nameSchemaMap[name];
    else throw new Error(`${name} is not schema name`);
  }
}

export function toSchemaName(num: number | string): SchemaName {
  if (typeof num === "string") {
    if (isSchemaName(num)) return num;
    else throw new Error(`${num} is not schema name`);
  } else {
    if (isSchema(num)) return schemaMap[num];
    else throw new Error(`${num} is not schema`);
  }
}



