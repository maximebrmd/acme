using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Review;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RequestChangesTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "approvalId": "approvalId",
              "subjectHash": "subjectHash",
              "comment": "x"
            }
            """;

        const string mockResponse = """
            {
              "approval": {
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
                "status": "pending",
                "subjectHash": "subjectHash"
              },
              "comment": {
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
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/request-changes")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPost()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Review.RequestChangesAsync(
            new ChangesRequest
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                ApprovalId = "approvalId",
                SubjectHash = "subjectHash",
                Comment = "x",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "approvalId": "approvalId",
              "subjectHash": "subjectHash",
              "comment": "comment"
            }
            """;

        const string mockResponse = """
            {
              "approval": {
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
                "status": "pending",
                "subjectHash": "subjectHash"
              },
              "comment": {
                "anchor": {
                  "channelId": "channelId",
                  "selection": {
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
                    "kind": "member"
                  }
                },
                "text": "text"
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/request-changes")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPost()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Review.RequestChangesAsync(
            new ChangesRequest
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                ApprovalId = "approvalId",
                SubjectHash = "subjectHash",
                Comment = "comment",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
