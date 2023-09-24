import { Config } from "../../../backbone/config.js";
import { tokens } from "typed-inject";
import { ZkcId } from "../../types/zkc.credential.js";
import { hash as sha256 } from "@stablelib/sha256";
import * as u8a from "uint8arrays";
import * as t from "io-ts";
import crypto from "node:crypto";
import { ClientError, ServerError } from "../../../backbone/errors.js";
import { ThrowDecoder } from "../../../util/throw-decoder.util.js";
import { rest } from "../../../util/fetch.util.js";
import { FastifyRequest } from "fastify";

const AccountCreateResp = t.exact(
  t.type({
    data: t.type({
      type: t.string,
      id: t.string,
      attributes: t.type({
        "reference-id": t.string,
        "created-at": t.string,
        "updated-at": t.string,
      })
    })
  })
);

const AccountFindResp = t.array(
  t.exact(
    t.type({
      data: t.type({
        type: t.string,
        id: t.string,
        attributes: t.type({
          "reference-id": t.string,
          "created-at": t.string,
          "updated-at": t.string,
        })
      })
    })
  )
);


type Account = {
  Create: {
    Args: {
      referenceId: string;
    },
    Resp: t.TypeOf<typeof AccountCreateResp>
    Return: {
      referenceId: string;
      createdAt: Date;
      updatedAt: Date;
    }
  }
  FindOne: {
    Args: {
      referenceId: string;
    },
    Resp: t.TypeOf<typeof AccountFindResp>
    Return: {
      referenceId: string;
      createdAt: Date;
      updatedAt: Date;
    } | undefined
  }
}

const InquiryCreateResp = t.exact(
  t.type({
    data: t.type({
      type: t.string,
      id: t.string,
      attributes: t.type({
        status: t.string,
        "reference-id": t.string,
      })
    })
  })
);

export const PersonaUser = t.exact(
  t.type({
    firstName: t.string,
    lastName: t.string,
    birthdate: t.number,
    countryCode: t.string,
    document: t.type({
      type: t.string,
      id: t.string
    })
  })
);

export type PersonaUser = t.TypeOf<typeof PersonaUser>

export type Inquiry = {
  Create: {
    Args: {
      referenceId: string;
    };
    Resp: t.TypeOf<typeof InquiryCreateResp>;
    Return: {
      inquiryId: string;
      verifyURL: string;
    }
  };
  Hook: {
    Return: {
      referenceId: string
      user: PersonaUser;
      // event is inquiry.completed
      completed: boolean;
      // if not completed reason must be
      reason?: string;
    }
  }
}

const InqEvent = t.exact(
  t.type({
    data: t.type({
      type: t.string,
      id: t.string,
      attributes: t.type({
        name: t.string,
        payload: t.type({
          data: t.type({
            type: t.string,
            id: t.string,
            attributes: t.type({
              status: t.string,
              "reference-id": t.string,
              "name-first": t.union([t.string, t.null]),
              "name-last": t.union([t.string, t.null]),
              birthdate: t.union([t.string, t.null]),
              fields: t.type({
                "address-country-code": t.type({
                  type: t.string,
                  value: t.union([t.string, t.null])
                }),
                "identification-class": t.type({
                  type: t.string,
                  value: t.union([t.string, t.null]),
                }),
                "identification-number": t.type({
                  type: t.string,
                  value: t.union([t.string, t.null]),
                })
              })
            })
          })
        })
      })
    })
  })
);

type InqEvent = t.TypeOf<typeof InqEvent>

const ToInqEvent = t.any
  .pipe(InqEvent);

const InqCompletedEvent = t.exact(
  t.type({
    data: t.type({
      type: t.string,
      id: t.string,
      attributes: t.type({
        name: t.string,
        payload: t.type({
          data: t.type({
            type: t.string,
            id: t.string,
            attributes: t.type({
              status: t.string,
              "reference-id": t.string,
              "name-first": t.string,
              "name-last": t.string,
              birthdate: t.string,
              fields: t.type({
                "address-country-code": t.type({
                  type: t.string,
                  value: t.string
                }),
                "identification-class": t.type({
                  type: t.string,
                  value: t.string,
                }),
                "identification-number": t.type({
                  type: t.string,
                  value: t.string,
                })
              })
            })
          })
        })
      })
    })
  })
);

type InqCompletedEvent = t.TypeOf<typeof InqCompletedEvent>

export class PersonaKYC {

  private readonly secret: Uint8Array;

  static inject = tokens("config");
  constructor(
    private readonly config: Config
  ) {
    const secretBytes = u8a.fromString(config.personaSecret, "utf8");
    this.secret = sha256(secretBytes);
  }

  /** Transform Zkc Identifier to Persona reference-id */
  refId(zkcId: ZkcId): string {
    const strId = `${String(zkcId.t)}:${zkcId.k}`;
    const refId = crypto.createHmac("sha256", this.secret);
    refId.update(strId);
    return refId.digest("hex");
  }

  /** Create Persona account by args */
  async createAccount(
    args: Account["Create"]["Args"]
  ): Promise<Account["Create"]["Return"]> {
    try {
      const { data } = await rest.fetchDecode(new URL("https://withpersona.com/api/v1/accounts"),
        AccountCreateResp,
        {
          method: "POST",
          headers: {
            "Persona-Version": "2023-01-05",
            "accept": "application/json",
            "authorization": `Bearer ${this.config.personaApiKey}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            "data": {
              "attributes": {
                "reference-id": `${args.referenceId}`
              }
            }
          })
        }
      );
      return {
        referenceId: data.attributes["reference-id"],
        createdAt: new Date(data.attributes["created-at"]),
        updatedAt: new Date(data.attributes["updated-at"])
      };
    } catch (e) {
      throw new ServerError("Internal server error", {
        props: {
          _place: this.constructor.name,
          _log: `Fetch Persona create account error. Details: ${String(e)}`
        }
      });
    }
  }

  async findAccount(
    args: Account["FindOne"]["Args"]
  ): Promise<Account["FindOne"]["Return"]> {
    try {
      const url = new URL("https://withpersona.com/api/v1/accounts");
      url.searchParams.set("filter[reference-id]", args.referenceId);
      const result = await rest.fetchDecode(url, AccountFindResp, {
        method: "GET",
        headers: {
          "Persona-Version": "2023-01-05",
          "accept": "application/json",
          "authorization": `Bearer ${this.config.personaApiKey}`,
        }
      });
      const attributes = result[0]?.data?.attributes;
      return attributes ? {
        referenceId: attributes["reference-id"],
        createdAt: new Date(attributes["created-at"]),
        updatedAt: new Date(attributes["updated-at"])
      } : undefined;
    } catch (e) {
      throw new ServerError("Internal server error", {
        props: {
          _place: this.constructor.name,
          _log: `Fetch Persona find account error. Details: ${String(e)}`
        }
      });
    }
  }

  async createInquiry(
    args: Inquiry["Create"]["Args"]
  ): Promise<Inquiry["Create"]["Return"]> {
    try {
      const { data } = await rest.fetchDecode(new URL("https://withpersona.com/api/v1/inquiries"),
        InquiryCreateResp,
        {
          method: "POST",
          headers: {
            "Persona-Version": "2023-01-05",
            "accept": "application/json",
            "authorization": `Bearer ${this.config.personaApiKey}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            data: {
              attributes: {
                "reference-id": args.referenceId,
                "inquiry-template-id": this.config.personaTemplateId
              }
            }
          })
        }
      );
      const inquiryId = data.id;
      return {
        inquiryId: inquiryId,
        verifyURL: `https://withpersona.com/verify?inquiry-id=${inquiryId}`
      };
    } catch (e) {
      throw new ServerError("Internal server error", {
        props: {
          _place: this.constructor.name,
          _log: `Fetch Persona create inquiry error. Details: ${String(e)}`
        }
      });
    }
  }

  async handleWebhook(req: FastifyRequest): Promise<Inquiry["Hook"]["Return"]> {
    this.verifyCallback(req);
    const { data } = ThrowDecoder.decode(ToInqEvent, req.body,
      new ClientError("Invalid type of inquiry webhook")
    );
    this.checkHook({ data });
    if (data.type === "inquiry.failed") return {
      referenceId: data.attributes.payload.data.attributes["reference-id"],
      user: emptyUser,
      completed: false,
      reason: `User verification failed`
    };
    const completedEvent = ThrowDecoder.decode(
      InqCompletedEvent, { data },
      new ClientError("Inquiry completed event haven't required fields")
    );
    const user = completedEvent.data.attributes.payload.data.attributes;
    return {
      referenceId: user["reference-id"],
      user: {
        firstName: user["name-first"],
        lastName: user["name-last"],
        birthdate: new Date(user.birthdate).getTime(),
        countryCode: user.fields["address-country-code"].value,
        document: {
          type: user.fields["identification-class"].value,
          id: user.fields["identification-number"].value
        }
      },
      completed: true
    };
  }

  private verifyCallback({
    headers,
    body
  }: FastifyRequest) {
    const personaSign = (headers["Persona-Signature"]
        ? headers["Persona-Signature"]
        : headers["persona-signature"]
    ) as string;
    if (!personaSign) throw new ClientError("No webhook signature in header");
    const signParams: Record<string, string | undefined> = {};
    personaSign.split(",")
      .forEach(pair => {
        const [key, value] = pair.split("=");
        signParams[key!] = value;
      });
    if (!signParams.t || !signParams.v1) {
      throw new ClientError("Invalid Persona-Signature header");
    }
    const hmac = crypto.createHmac("sha256", this.config.personaHookSecret)
      .update(`${signParams.t}.${JSON.stringify(body)}`)
      .digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signParams.v1))) {
      throw new ClientError("Signature is invalid or secret is expired");
    }
  };

  private checkHook({ data }: InqEvent) {
    if (data.type !== "event") throw new ClientError("Invalid entity type");
    const attributes = data.attributes;
    if (!(["inquiry.completed", "inquiry.failed"].includes(attributes.name))) {
      throw new ClientError("Event attributes name must be: inquiry.completed or inquiry.failed");
    }
    const payload = attributes.payload.data;
    if (payload.type !== "inquiry") throw new ClientError("Invalid entity type");
    const payloadStatue = payload.attributes.status;
    if (!(["completed", "failed"].includes(payloadStatue))) {
      throw new ClientError("Event payload attributes status must be: completed or failed");
    }
  }
}

const emptyUser: PersonaUser = {
  firstName: "",
  lastName: "",
  birthdate: 0,
  countryCode: "",
  document: {
    type: "",
    id: ""
  },
};
