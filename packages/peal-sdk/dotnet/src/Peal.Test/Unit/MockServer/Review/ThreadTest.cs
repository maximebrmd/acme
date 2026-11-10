using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Review;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ThreadTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "approvals": [
                {
                  "decision": {
                    "at": "at",
                    "by": {
                      "kind": "member",
                      "linkId": "linkId",
                      "name": "name",
                      "userId": "userId"
                    }
                  },
                  "id": "id",
                  "postId": "postId",
                  "requestedAt": "requestedAt",
                  "requestedBy": "requestedBy",
                  "requestedByName": "requestedByName",
                  "requestedVia": "member",
                  "schedule": {
                    "at": "at",
                    "timeZone": "timeZone"
                  },
                  "status": "pending"
                },
                {
                  "decision": {
                    "at": "at",
                    "by": {
                      "kind": "member",
                      "linkId": "linkId",
                      "name": "name",
                      "userId": "userId"
                    }
                  },
                  "id": "id",
                  "postId": "postId",
                  "requestedAt": "requestedAt",
                  "requestedBy": "requestedBy",
                  "requestedByName": "requestedByName",
                  "requestedVia": "member",
                  "schedule": {
                    "at": "at",
                    "timeZone": "timeZone"
                  },
                  "status": "pending"
                }
              ],
              "comments": [
                {
                  "anchor": {
                    "channelId": "channelId",
                    "selection": {
                      "located": {
                        "end": 1,
                        "start": 1
                      },
                      "quote": "quote",
                      "start": 1
                    }
                  },
                  "author": {
                    "kind": "member",
                    "linkId": "linkId",
                    "name": "name",
                    "userId": "userId"
                  },
                  "createdAt": "createdAt",
                  "id": "id",
                  "parentId": "parentId",
                  "postId": "postId",
                  "resolved": {
                    "at": "at",
                    "by": {
                      "kind": "member",
                      "linkId": "linkId",
                      "name": "name",
                      "userId": "userId"
                    }
                  },
                  "text": "text"
                },
                {
                  "anchor": {
                    "channelId": "channelId",
                    "selection": {
                      "located": {
                        "end": 1,
                        "start": 1
                      },
                      "quote": "quote",
                      "start": 1
                    }
                  },
                  "author": {
                    "kind": "member",
                    "linkId": "linkId",
                    "name": "name",
                    "userId": "userId"
                  },
                  "createdAt": "createdAt",
                  "id": "id",
                  "parentId": "parentId",
                  "postId": "postId",
                  "resolved": {
                    "at": "at",
                    "by": {
                      "kind": "member",
                      "linkId": "linkId",
                      "name": "name",
                      "userId": "userId"
                    }
                  },
                  "text": "text"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/review")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Review.ThreadAsync(
            new ThreadReviewRequest { WorkspaceId = "workspaceId", PostId = "postId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "approvals": [
                {
                  "decision": {
                    "at": "at",
                    "by": {
                      "kind": "member"
                    }
                  },
                  "id": "id",
                  "postId": "postId",
                  "requestedAt": "requestedAt",
                  "requestedBy": "requestedBy",
                  "requestedByName": "requestedByName",
                  "requestedVia": "member",
                  "schedule": {
                    "at": "at",
                    "timeZone": "timeZone"
                  },
                  "status": "pending"
                }
              ],
              "comments": [
                {
                  "anchor": {
                    "channelId": "channelId"
                  },
                  "author": {
                    "kind": "member"
                  },
                  "createdAt": "createdAt",
                  "id": "id",
                  "parentId": "parentId",
                  "postId": "postId",
                  "resolved": {
                    "at": "at",
                    "by": {
                      "kind": "member"
                    }
                  },
                  "text": "text"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/review")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Review.ThreadAsync(
            new ThreadReviewRequest { WorkspaceId = "workspaceId", PostId = "postId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
