import { O1GraphLink } from "o1js-trgraph";
import { JalProgramInfo } from "../../types/verifiers.type.js";

export const jalProgramInfo: JalProgramInfo<"o1js:zk-program.cjs", O1GraphLink> = {
  proposalComment: "If you are under 18 years old you will not pass authentication",
  jalProgram: {
    target: "o1js:zk-program.cjs",
    inputSchema: {
      private: {
        credential: {
          attributes: {
            type: {
              type: "setup",
              transLinks: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"],
            },
            issuanceDate: {
              type: "setup",
              transLinks: ["isodate-bytesdate", "bytesdate-unixtime19", "unixtime19-uint64", "uint64-mina:field"]
            },
            validFrom: {
              type: "setup",
              transLinks: ["isodate-bytesdate", "bytesdate-unixtime19", "unixtime19-uint64", "uint64-mina:field"]
            },
            validUntil: {
              type: "setup",
              transLinks: ["isodate-bytesdate", "bytesdate-unixtime19", "unixtime19-uint64", "uint64-mina:field"]
            },
            subject: {
              id: {
                type: {
                  type: "setup",
                  transLinks: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"]
                },
                key: {
                  type: "setup",
                  transLinks: ["base58-mina:publickey"]
                }
              },
              birthDate: {
                type: "setup",
                transLinks: ["isodate-bytesdate", "bytesdate-unixtime19", "unixtime19-uint64", "uint64-mina:field"]
              },
              firstName: {
                type: "setup",
                transLinks: ["utf8-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"]
              },
              gender: {
                type: "setup",
                transLinks: ["ascii-bytes", "bytes-uint64", "uint64-mina:field"]
              },
              lastName: {
                type: "setup",
                transLinks: ["utf8-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"]
              }
            },
            countryCode: {
              type: "setup",
              transLinks: ["iso3166alpha3-iso3166numeric", "iso3166numeric-uint16", "uint16-mina:field"]
            },
            document: {
              id: {
                type: "setup",
                transLinks: ["utf8-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"]
              },
              sybilId: {
                type: "setup",
                transLinks: ["base58-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"]
              }
            }
          },
          proofs: {
            "mina:poseidon-pasta": {
              "mina:publickey:B62qmNen3kDN74CJ2NQteNABrEN4AurGTbsLrraPy6ipQgUV9Q73tv2": {
                issuer: {
                  id: {
                    type: {
                      type: "setup",
                      transLinks: ["ascii-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"]
                    },
                    key: {
                      type: "setup",
                      transLinks: ["base58-mina:publickey"]
                    }
                  }
                },
                signature: {
                  type: "setup",
                  transLinks: ["base58-mina:signature"]
                }
              }
            }
          }
        }
      },
      public: {
        credential: {
          attributes: {
            subject: {
              id: {
                type: {
                  type: "reference",
                  path: ["private", "credential", "attributes", "subject", "id", "type"]
                },
                key: {
                  type: "reference",
                  path: ["private", "credential", "attributes", "subject", "id", "key"]
                }
              }
            },
            document: {
              sybilId: {
                type: "reference",
                path: ["private", "credential", "attributes", "document", "sybilId"]
              }
            }
          }
        },
        context: {
          now: {
            type: "setup",
            transLinks: ["isodate-bytesdate", "bytesdate-unixtime19", "unixtime19-uint64", "uint64-mina:field"]
          }
        }
      }
    },
    commands: [
      {
        assert: {
          in: [{
            type: "function", equal: {
              in: [
                { type: "reference", path: ["private", "credential", "attributes", "subject", "id", "type"] },
                { type: "reference", path: ["public", "credential", "attributes", "subject", "id", "type"] }
              ]
            }
          }]
        }
      },
      {
        assert: {
          in: [{
            type: "function", equal: {
              in: [
                { type: "reference", path: ["private", "credential", "attributes", "subject", "id", "key"] },
                { type: "reference", path: ["public", "credential", "attributes", "subject", "id", "key"] }
              ]
            }
          }]
        }
      },
      {
        assert: {
          in: [{
            type: "function", equal: {
              in: [
                { type: "reference", path: ["private", "credential", "attributes", "document", "sybilId"] },
                { type: "reference", path: ["public", "credential", "attributes", "document", "sybilId"] }
              ]
            }
          }]
        }
      },
      {
        assert: {
          in: [{
            type: "function", equal: {
              in: [
                { type: "reference", path: ["public", "context", "now"] },
                { type: "reference", path: ["public", "context", "now"] }
              ]
            }
          }]
        }
      },
      {
        assert: {
          in: [{
            type: "function", greaterEqual: {
              in: [
                {
                  type: "function", sub: {
                    in: [
                      { type: "reference", path: ["public", "context", "now"] },
                      { type: "reference", path: ["private", "credential", "attributes", "subject", "birthDate"] }
                    ]
                  }
                },
                {
                  type: "function", mul: {
                    in: [
                      { type: "static", value: 18, transLinks: ["uint64-mina:field"] },
                      { type: "constant", name: "year" }
                    ]
                  }
                }
              ]
            }
          }]
        }
      },
      {
        assert: {
          in: [{
            type: "function", verifySign: {
              in: [
                "mina:pasta",
                {
                  type: "reference",
                  path: [
                    "private", "credential", "proofs", "mina:poseidon-pasta",
                    "mina:publickey:B62qmNen3kDN74CJ2NQteNABrEN4AurGTbsLrraPy6ipQgUV9Q73tv2",
                    "signature"
                  ]
                },
                {
                  type: "function", hash: {
                    in: [
                      "mina:poseidon",
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "countryCode"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "document", "id"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "document", "sybilId"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "issuanceDate"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "subject", "birthDate"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "subject", "firstName"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "subject", "gender"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "subject", "id", "key"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "subject", "id", "type"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "subject", "lastName"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "type"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "validFrom"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "validUntil"]
                      }
                    ]
                  }
                },
                {
                  type: "reference",
                  path: [
                    "private", "credential", "proofs", "mina:poseidon-pasta",
                    "mina:publickey:B62qmNen3kDN74CJ2NQteNABrEN4AurGTbsLrraPy6ipQgUV9Q73tv2",
                    "issuer", "id", "key"
                  ]
                }
              ]
            }
          }]
        }
      }
    ]
  }
};