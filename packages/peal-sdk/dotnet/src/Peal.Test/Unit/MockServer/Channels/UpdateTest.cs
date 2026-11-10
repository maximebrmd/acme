using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Channels;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Channels.UpdateAsync(
            new ChannelUpdate
            {
                WorkspaceId = "workspaceId",
                ChannelId = "channelId",
                Label = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Channels.UpdateAsync(
            new ChannelUpdate
            {
                WorkspaceId = "workspaceId",
                ChannelId = "channelId",
                Label = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
