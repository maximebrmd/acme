using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Inbox;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ReplyTest : BaseMockServerTest
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
              "authorId": "authorId",
              "commentId": "commentId",
              "createdAt": "createdAt",
              "id": "id",
              "permalink": "permalink",
              "reason": "channelUnavailable",
              "settledAt": "settledAt",
              "status": "sending",
              "text": "text",
              "threadId": "threadId"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/comments/commentId/replies")
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

        var response = await Client.Inbox.ReplyAsync(
            new NewInboxReply
            {
                WorkspaceId = "workspaceId",
                CommentId = "commentId",
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
              "authorId": "authorId",
              "commentId": "commentId",
              "createdAt": "createdAt",
              "id": "id",
              "permalink": "permalink",
              "reason": "channelUnavailable",
              "settledAt": "settledAt",
              "status": "sending",
              "text": "text",
              "threadId": "threadId"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/comments/commentId/replies")
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

        var response = await Client.Inbox.ReplyAsync(
            new NewInboxReply
            {
                WorkspaceId = "workspaceId",
                CommentId = "commentId",
                Text = "text",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
