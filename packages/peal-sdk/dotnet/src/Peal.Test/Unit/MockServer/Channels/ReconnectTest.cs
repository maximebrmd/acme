using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Channels;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ReconnectTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "authorizationUrl": "authorizationUrl"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId/reconnect")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Channels.ReconnectAsync(
            new ReconnectChannelsRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "authorizationUrl": "authorizationUrl"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId/reconnect")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Channels.ReconnectAsync(
            new ReconnectChannelsRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
