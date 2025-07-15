import { equal, greater, greaterOrEqual, Input, less, Ref } from "@jaljs/js-zcred";

export * from "./o1js-dev.js";

export type PassportInputSchema<TLink extends string = string> = Input<TLink> & {
  credential: {
    attributes: {
      subject: {
        id: {
          key: ReturnType<typeof Ref<TLink>>;
          type: ReturnType<typeof Ref<TLink>>;
        }
        birthDate: ReturnType<typeof Ref<TLink>>;
        firstName: ReturnType<typeof Ref<TLink>>;
        gender: ReturnType<typeof Ref<TLink>>;
        lastName: ReturnType<typeof Ref<TLink>>;
      },
      countryCode: ReturnType<typeof Ref<TLink>>;
      document: {
        id: ReturnType<typeof Ref<TLink>>;
        sybilId: ReturnType<typeof Ref<TLink>>;
      }
    }
  }
}

export type Sandbox = {
  issuerURI: string;
  inputSchema: PassportInputSchema;
  fromCountry: (alpha3CountryCode: string) => ReturnType<typeof equal>;
  olderThanYears: (years: number) => ReturnType<typeof greaterOrEqual>;
  youngerThanYears: (years: number) => ReturnType<typeof less>;
  passportNotExpired: () => ReturnType<typeof greater>
  genderIs: (gender: "male" | "female" | "other" | "unknown") => ReturnType<typeof equal>
}