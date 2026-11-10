using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Channels;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CompleteConnectTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "state": "x"
            }
            """;

        const string mockResponse = """
            {
              "_tag": "connected",
              "channel": {
                "avatarUrl": "avatarUrl",
                "connection": "instagramLogin",
                "displayName": "displayName",
                "handle": "handle",
                "id": "id",
                "label": "label",
                "platform": "x",
                "status": {
                  "_tag": "active"
                },
                "tokenExpiresAt": "tokenExpiresAt"
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/connect/x/callback")
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

        var response = await Client.Channels.CompleteConnectAsync(
            new ConnectCallback
            {
                WorkspaceId = "workspaceId",
                Platform = Platform.X,
                Code = null,
                Error = null,
                Iss = null,
                State = "x",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "state": "state"
            }
            """;

        const string mockResponse = """
            {
              "_tag": "connected",
              "channel": {
                "avatarUrl": "avatarUrl",
                "connection": "instagramLogin",
                "displayName": "displayName",
                "handle": "handle",
                "id": "id",
                "label": "label",
                "platform": "x",
                "status": {
                  "_tag": "active"
                },
                "tokenExpiresAt": "tokenExpiresAt"
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/connect/x/callback")
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

        var response = await Client.Channels.CompleteConnectAsync(
            new ConnectCallback
            {
                WorkspaceId = "workspaceId",
                Platform = Platform.X,
                State = "state",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
