using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Review;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ResolveTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "resolved": true
            }
            """;

        const string mockResponse = """
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/comments/commentId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Review.ResolveAsync(
            new ResolveReviewRequest
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                CommentId = "commentId",
                Resolved = true,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "resolved": true
            }
            """;

        const string mockResponse = """
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/comments/commentId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Review.ResolveAsync(
            new ResolveReviewRequest
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                CommentId = "commentId",
                Resolved = true,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
