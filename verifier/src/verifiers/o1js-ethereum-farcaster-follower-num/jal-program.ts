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
              transLinks: ["ascii-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"],
            },
            issuanceDate: {
              type: "setup",
              transLinks: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"]
            },
            validFrom: {
              type: "setup",
              transLinks: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"]
            },
            validUntil: {
              type: "setup",
              transLinks: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"]
            },
            subject: {
              id: {
                type: {
                  type: "setup",
                  transLinks: ["ascii-bytes", "bytes-uint128", "uint128-mina:field"]
                },
                key: {
                  type: "setup",
                  transLinks: ["0xhex-bytes", "bytes-uint", "uint-mina:field"]
                }
              },
              fid: {
                type: "setup",
                transLinks: ["ascii-uint", "mina:mod.order", "uint-mina:field"]
              },
              followingCount: {
                type: "setup",
                transLinks: ["uint128-mina:field"]
              },
              followerCount: {
                type: "setup",
                transLinks: ["uint128-mina:field"]
              },
              custodyAddress: {
                type: "setup",
                transLinks: ["0xhex-bytes", "bytes-uint", "uint-mina:field"]
              },
              verifiedAddress: {
                type: "setup",
                transLinks: ["0xhex-bytes", "bytes-uint", "uint-mina:field"]
              },
              username: {
                type: "setup",
                transLinks: ["utf8-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"]
              },
              displayName: {
                type: "setup",
                transLinks: ["utf8-bytes", "bytes-uint", "mina:mod.order", "uint-mina:field"]
              },
              registeredAt: {
                type: "setup",
                transLinks: ["isodate-unixtime", "unixtime-uint64", "uint64-mina:field"]
              }
            },
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
            }
          }
        },
        context: {
          now: {
            type: "setup",
            transLinks: ["isodate-unixtime19", "unixtime19-uint64", "uint64-mina:field"]
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
                  type: "reference",
                  path: ["private", "credential", "attributes", "subject", "followerCount"]
                },
                {
                  type: "static",
                  value: 10,
                  transLinks: ["uint128-mina:field"]
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
                        path: ["private", "credential", "attributes", "issuanceDate"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "subject", "custodyAddress"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "subject", "displayName"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "subject", "fid"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "subject", "followerCount"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "subject", "followingCount"]
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
                        path: ["private", "credential", "attributes", "subject", "registeredAt"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "subject", "username"]
                      },
                      {
                        type: "reference",
                        path: ["private", "credential", "attributes", "subject", "verifiedAddress"]
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