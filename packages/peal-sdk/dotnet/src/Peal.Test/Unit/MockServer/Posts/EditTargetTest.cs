using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Posts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class EditTargetTest : BaseMockServerTest
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
                    .WithPath("/api/workspaces/workspaceId/posts/postId/targets/targetId/edit")
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

        var response = await Client.Posts.EditTargetAsync(
            new LivePostEdit
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                TargetId = "targetId",
                Part = null,
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
                    .WithPath("/api/workspaces/workspaceId/posts/postId/targets/targetId/edit")
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

        var response = await Client.Posts.EditTargetAsync(
            new LivePostEdit
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                TargetId = "targetId",
                Text = "text",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
