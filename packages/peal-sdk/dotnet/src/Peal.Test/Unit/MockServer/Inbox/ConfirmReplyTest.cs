using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Inbox;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ConfirmReplyTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "sent": true
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
                    .WithPath("/api/workspaces/workspaceId/inbox/replies/replyId/confirmation")
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

        var response = await Client.Inbox.ConfirmReplyAsync(
            new ConfirmReplyInboxRequest
            {
                WorkspaceId = "workspaceId",
                ReplyId = "replyId",
                Sent = true,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "sent": true
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
                    .WithPath("/api/workspaces/workspaceId/inbox/replies/replyId/confirmation")
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

        var response = await Client.Inbox.ConfirmReplyAsync(
            new ConfirmReplyInboxRequest
            {
                WorkspaceId = "workspaceId",
                ReplyId = "replyId",
                Sent = true,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
