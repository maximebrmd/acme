using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.InboxMessages;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetConversationTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "abilities": {
                "read": "available",
                "send": "available"
              },
              "conversation": {
                "channelId": "channelId",
                "id": "id",
                "lastIncomingAt": "lastIncomingAt",
                "lastMessageAt": "lastMessageAt",
                "messages": 1,
                "participants": [
                  {
                    "displayName": "displayName",
                    "handle": "handle",
                    "platformId": "platformId"
                  },
                  {
                    "displayName": "displayName",
                    "handle": "handle",
                    "platformId": "platformId"
                  }
                ],
                "readAt": "readAt",
                "request": true,
                "unread": true
              },
              "messages": [
                {
                  "attachments": 1,
                  "conversationId": "conversationId",
                  "fromAccount": true,
                  "id": "id",
                  "senderPlatformId": "senderPlatformId",
                  "sentAt": "sentAt",
                  "text": "text"
                },
                {
                  "attachments": 1,
                  "conversationId": "conversationId",
                  "fromAccount": true,
                  "id": "id",
                  "senderPlatformId": "senderPlatformId",
                  "sentAt": "sentAt",
                  "text": "text"
                }
              ],
              "platform": "x",
              "sent": [
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
                },
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
              ],
              "window": {
                "closesAt": "closesAt",
                "open": true
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/api/workspaces/workspaceId/inbox/messages/conversations/conversationId"
                    )
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxMessages.GetConversationAsync(
            new GetConversationInboxMessagesRequest
            {
                WorkspaceId = "workspaceId",
                ConversationId = "conversationId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "abilities": {
                "read": "available",
                "send": "available"
              },
              "conversation": {
                "channelId": "channelId",
                "id": "id",
                "lastIncomingAt": "lastIncomingAt",
                "lastMessageAt": "lastMessageAt",
                "messages": 1,
                "participants": [
                  {
                    "handle": "handle",
                    "platformId": "platformId"
                  }
                ],
                "readAt": "readAt",
                "request": true,
                "unread": true
              },
              "messages": [
                {
                  "attachments": 1,
                  "conversationId": "conversationId",
                  "fromAccount": true,
                  "id": "id",
                  "senderPlatformId": "senderPlatformId",
                  "sentAt": "sentAt",
                  "text": "text"
                }
              ],
              "platform": "x",
              "sent": [
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
              ],
              "window": {
                "closesAt": "closesAt",
                "open": true
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/api/workspaces/workspaceId/inbox/messages/conversations/conversationId"
                    )
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxMessages.GetConversationAsync(
            new GetConversationInboxMessagesRequest
            {
                WorkspaceId = "workspaceId",
                ConversationId = "conversationId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
