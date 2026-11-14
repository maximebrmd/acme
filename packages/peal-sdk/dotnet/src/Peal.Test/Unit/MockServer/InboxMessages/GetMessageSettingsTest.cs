using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.InboxMessages;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetMessageSettingsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
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
                    .WithPath("/api/workspaces/workspaceId/inbox/messages/settings")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxMessages.GetMessageSettingsAsync(
            new GetMessageSettingsInboxMessagesRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
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
                    .WithPath("/api/workspaces/workspaceId/inbox/messages/settings")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxMessages.GetMessageSettingsAsync(
            new GetMessageSettingsInboxMessagesRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
