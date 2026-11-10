using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Review;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CommentTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "text": "x"
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
                    .WithPath("/api/workspaces/workspaceId/posts/postId/comments")
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

        var response = await Client.Review.CommentAsync(
            new NewComment
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                Anchor = null,
                ParentId = null,
                Text = "x",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "text": "text"
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
                    .WithPath("/api/workspaces/workspaceId/posts/postId/comments")
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

        var response = await Client.Review.CommentAsync(
            new NewComment
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                Text = "text",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
