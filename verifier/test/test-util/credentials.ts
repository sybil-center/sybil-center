export const SybilPassportEth = {
  "meta": {
    "issuer": {
      "type": "http",
      "uri": "http://localhost:8080/issuers/passport"
    },
    "definitions": {
      "attributes": {
        "type": "document type (passport)",
        "validFrom": "passport valid from date",
        "issuanceDate": "passport issuance date",
        "validUntil": "passport valid until",
        "subject": {
          "id": {
            "type": "passport owner public key type",
            "key": "passport owner public key"
          },
          "firstName": "passport owner first name",
          "lastName": "passport owner last name",
          "birthDate": "passport owner birth date",
          "gender": "passport owner gender"
        },
        "countryCode": "passport country code",
        "document": {
          "id": "passport id (should be private)",
          "sybilId": "document unique public id"
        }
      }
    }
  },
  "attributes": {
    "type": "passport",
    "issuanceDate": "2024-06-19T10:01:57.587Z",
    "validFrom": "2014-12-31T21:00:00.000Z",
    "validUntil": "2029-12-31T21:00:00.000Z",
    "subject": {
      "id": {
        "type": "ethereum:address",
        "key": "0xcee05036e05350c2985582f158aee0d9e0437446"
      },
      "firstName": "John",
      "lastName": "Smith",
      "birthDate": "1994-12-31T21:00:00.000Z",
      "gender": "male"
    },
    "countryCode": "GBR",
    "document": {
      "id": "test-passport:123456",
      "sybilId": "2kb3KNqgsw3h5SaN79u1jURErzP8"
    }
  },
  "proofs": {
    "mina:poseidon-pasta": {
      "mina:publickey:B62qmNen3kDN74CJ2NQteNABrEN4AurGTbsLrraPy6ipQgUV9Q73tv2": {
        "type": "mina:poseidon-pasta",
        "issuer": {
          "id": {
            "type": "mina:publickey",
            "key": "B62qmNen3kDN74CJ2NQteNABrEN4AurGTbsLrraPy6ipQgUV9Q73tv2"
          }
        },
        "signature": "7mXCMUrPtqxjMK7V2cB4hXy23sJvNpX2tzVQ9horxbS5gpvqyTtYAVNiAPjJ4kGayHocb5EFAaJmA5CuBi1BMSTj5JohR54S",
        "schema": {
          "attributes": {
            "countryCode": [
              "iso3166alpha3-iso3166numeric",
              "iso3166numeric-uint16",
              "uint16-mina:field"
            ],
            "document": {
              "id": [
                "utf8-bytes",
                "bytes-uint",
                "mina:mod.order",
                "uint-mina:field"
              ],
              "sybilId": [
                "base58-bytes",
                "bytes-uint",
                "mina:mod.order",
                "uint-mina:field"
              ]
            },
            "issuanceDate": [
              "isodate-bytesdate",
              "bytesdate-unixtime19",
              "unixtime19-uint64",
              "uint64-mina:field"
            ],
            "subject": {
              "birthDate": [
                "isodate-bytesdate",
                "bytesdate-unixtime19",
                "unixtime19-uint64",
                "uint64-mina:field"
              ],
              "firstName": [
                "utf8-bytes",
                "bytes-uint",
                "mina:mod.order",
                "uint-mina:field"
              ],
              "gender": [
                "ascii-bytes",
                "bytes-uint64",
                "uint64-mina:field"
              ],
              "id": {
                "key": [
                  "0xhex-bytes",
                  "bytes-uint",
                  "uint-mina:field"
                ],
                "type": [
                  "ascii-bytes",
                  "bytes-uint128",
                  "uint128-mina:field"
                ]
              },
              "lastName": [
                "utf8-bytes",
                "bytes-uint",
                "mina:mod.order",
                "uint-mina:field"
              ]
            },
            "type": [
              "ascii-bytes",
              "bytes-uint128",
              "uint128-mina:field"
            ],
            "validFrom": [
              "isodate-bytesdate",
              "bytesdate-unixtime19",
              "unixtime19-uint64",
              "uint64-mina:field"
            ],
            "validUntil": [
              "isodate-bytesdate",
              "bytesdate-unixtime19",
              "unixtime19-uint64",
              "uint64-mina:field"
            ]
          },
          "type": [
            "ascii-bytes",
            "bytes-uint",
            "mina:mod.order",
            "uint-mina:field"
          ],
          "signature": [
            "base58-mina:signature"
          ],
          "issuer": {
            "id": {
              "type": [
                "ascii-bytes",
                "bytes-uint",
                "mina:mod.order",
                "uint-mina:field"
              ],
              "key": [
                "base58-mina:publickey"
              ]
            }
          }
        }
      }
    }
  },
  "protection": {
    "jws": "eyJhbGciOiJFZERTQSIsImtpZCI6ImRpZDprZXk6ejZNa21TWkd5aE1rTkhIR0NnUVJKYVN2NXlRbjVqMjgzZEZ0clpHNnp1QmpNREttI3o2TWttU1pHeWhNa05ISEdDZ1FSSmFTdjV5UW41ajI4M2RGdHJaRzZ6dUJqTURLbSJ9..6tJkTYGbL8VZG4aHkbLQDg5s-2IRELicr10Qbx8A5hitbtHRuUcsHi66S980OMcaD0jZVs6XIpA6OAROqeF-BQ"
  }
} as const;