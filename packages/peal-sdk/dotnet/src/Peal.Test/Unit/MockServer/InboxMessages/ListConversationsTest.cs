using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.InboxMessages;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListConversationsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "items": [
                {
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
                {
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
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/messages/conversations")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxMessages.ListConversationsAsync(
            new ListConversationsInboxMessagesRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "items": [
                {
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
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/messages/conversations")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxMessages.ListConversationsAsync(
            new ListConversationsInboxMessagesRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
