// import { ZkCredRoutes } from "../../../base/types/route.js";
// import { ZKC_ID_TYPE_ALIASES } from "../../../base/types/zkc.issuer.js";
// import { ZKC } from "../../../util/zk-credentials/index.js";
//
// const tags = ["ZKC GitHub account ownership Zero Knowledge Credential"];
//
// export const ZkcGithubAccountRoutes: ZkCredRoutes = {
//   schemaName: "GitHubAccount",
//
//   challenge: {
//     method: ["POST"],
//     url: ZKC.EPs.v1("GitHubAccount").challenge,
//     schema: {
//       tags: tags,
//       body: {
//         type: "object",
//         required: [
//           "subjectId"
//         ],
//         properties: {
//           subjectId: {
//             type: "object",
//             required: [
//               "t",
//               "k"
//             ],
//             properties: {
//               t: { enum: ZKC_ID_TYPE_ALIASES },
//               k: { type: "string" }
//             }
//           },
//           expirationDate: {
//             type: "number",
//             nullable: true
//           },
//           redirectUrl: {
//             type: "string",
//             format: "uri",
//             nullable: true
//           },
//           options: {
//             type: "object",
//             nullable: true
//           }
//         }
//       }
//     }
//   },
//
//   canIssue: {
//     method: ["GET"],
//     url: ZKC.EPs.v1("GitHubAccount").canIssue,
//     schema: {
//       tags: tags,
//       querystring: {
//         type: "object",
//         required: ["sessionId"],
//         properties: {
//           sessionId: { type: "string" }
//         }
//       },
//       response: {
//         200: {
//           type: "object",
//           properties: {
//             canIssue: { type: "boolean" }
//           }
//         }
//       }
//     }
//   },
//
//   issue: {
//     method: ["POST"],
//     url: ZKC.EPs.v1("GitHubAccount").issue,
//     schema: {
//       tags: tags,
//       body: {
//         type: "object",
//         required: ["sessionId", "signature"],
//         properties: {
//           sessionId: { type: "string" },
//           signature: { type: "string" }
//         }
//       }
//     }
//   }
// };
