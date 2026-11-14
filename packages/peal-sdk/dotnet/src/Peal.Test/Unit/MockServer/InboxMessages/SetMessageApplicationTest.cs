using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.InboxMessages;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SetMessageApplicationTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "allowed": true,
              "clientId": "x"
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
                    .WithPath("/api/workspaces/workspaceId/inbox/messages/applications")
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

        var response = await Client.InboxMessages.SetMessageApplicationAsync(
            new SetMessageApplicationInboxMessagesRequest
            {
                WorkspaceId = "workspaceId",
                Allowed = true,
                ClientId = "x",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "allowed": true,
              "clientId": "clientId"
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
                    .WithPath("/api/workspaces/workspaceId/inbox/messages/applications")
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

        var response = await Client.InboxMessages.SetMessageApplicationAsync(
            new SetMessageApplicationInboxMessagesRequest
            {
                WorkspaceId = "workspaceId",
                Allowed = true,
                ClientId = "clientId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
