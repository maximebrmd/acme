using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Posts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UnpublishTargetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "alreadyGone": true,
              "code": "code",
              "finishedAt": "finishedAt",
              "id": "id",
              "kind": "unpublish",
              "partsLeft": 1,
              "postId": "postId",
              "requestedAt": "requestedAt",
              "status": "pending",
              "targetId": "targetId"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/targets/targetId/unpublish")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Posts.UnpublishTargetAsync(
            new UnpublishTargetPostsRequest
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                TargetId = "targetId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "alreadyGone": true,
              "code": "code",
              "finishedAt": "finishedAt",
              "id": "id",
              "kind": "unpublish",
              "partsLeft": 1,
              "postId": "postId",
              "requestedAt": "requestedAt",
              "status": "pending",
              "targetId": "targetId"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/targets/targetId/unpublish")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Posts.UnpublishTargetAsync(
            new UnpublishTargetPostsRequest
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                TargetId = "targetId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
