using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.InboxMessages;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SendMessageTest : BaseMockServerTest
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
                        "/api/workspaces/workspaceId/inbox/messages/conversations/conversationId/messages"
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

        var response = await Client.InboxMessages.SendMessageAsync(
            new NewInboxMessage
            {
                WorkspaceId = "workspaceId",
                ConversationId = "conversationId",
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
                        "/api/workspaces/workspaceId/inbox/messages/conversations/conversationId/messages"
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

        var response = await Client.InboxMessages.SendMessageAsync(
            new NewInboxMessage
            {
                WorkspaceId = "workspaceId",
                ConversationId = "conversationId",
                Text = "text",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
