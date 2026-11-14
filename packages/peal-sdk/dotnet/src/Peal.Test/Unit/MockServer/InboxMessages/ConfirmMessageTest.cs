using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.InboxMessages;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ConfirmMessageTest : BaseMockServerTest
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
              "conversationId": "conversationId",
              "createdAt": "createdAt",
              "id": "id",
              "platformMessageId": "platformMessageId",
              "reason": "channelUnavailable",
              "settledAt": "settledAt",
              "status": "sending",
              "text": "text"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/api/workspaces/workspaceId/inbox/messages/messages/messageId/confirmation"
                    )
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

        var response = await Client.InboxMessages.ConfirmMessageAsync(
            new ConfirmMessageInboxMessagesRequest
            {
                WorkspaceId = "workspaceId",
                MessageId = "messageId",
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
              "conversationId": "conversationId",
              "createdAt": "createdAt",
              "id": "id",
              "platformMessageId": "platformMessageId",
              "reason": "channelUnavailable",
              "settledAt": "settledAt",
              "status": "sending",
              "text": "text"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/api/workspaces/workspaceId/inbox/messages/messages/messageId/confirmation"
                    )
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

        var response = await Client.InboxMessages.ConfirmMessageAsync(
            new ConfirmMessageInboxMessagesRequest
            {
                WorkspaceId = "workspaceId",
                MessageId = "messageId",
                Sent = true,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
