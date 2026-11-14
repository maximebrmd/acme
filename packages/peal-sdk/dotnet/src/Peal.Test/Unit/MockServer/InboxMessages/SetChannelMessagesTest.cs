using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.InboxMessages;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SetChannelMessagesTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "enabled": true
            }
            """;

        const string mockResponse = """
            {
              "applications": [
                {
                  "clientId": "clientId",
                  "grantedAt": "grantedAt",
                  "grantedBy": "grantedBy"
                },
                {
                  "clientId": "clientId",
                  "grantedAt": "grantedAt",
                  "grantedBy": "grantedBy"
                }
              ],
              "channels": [
                {
                  "channelId": "channelId",
                  "enabledAt": "enabledAt",
                  "enabledBy": "enabledBy"
                },
                {
                  "channelId": "channelId",
                  "enabledAt": "enabledAt",
                  "enabledBy": "enabledBy"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/messages/channels/channelId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPut()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxMessages.SetChannelMessagesAsync(
            new SetChannelMessagesInboxMessagesRequest
            {
                WorkspaceId = "workspaceId",
                ChannelId = "channelId",
                Enabled = true,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "enabled": true
            }
            """;

        const string mockResponse = """
            {
              "applications": [
                {
                  "clientId": "clientId",
                  "grantedAt": "grantedAt",
                  "grantedBy": "grantedBy"
                }
              ],
              "channels": [
                {
                  "channelId": "channelId",
                  "enabledAt": "enabledAt",
                  "enabledBy": "enabledBy"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/messages/channels/channelId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPut()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxMessages.SetChannelMessagesAsync(
            new SetChannelMessagesInboxMessagesRequest
            {
                WorkspaceId = "workspaceId",
                ChannelId = "channelId",
                Enabled = true,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
