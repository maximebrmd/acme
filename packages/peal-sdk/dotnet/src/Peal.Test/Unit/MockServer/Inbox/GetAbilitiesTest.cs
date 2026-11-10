using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Inbox;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetAbilitiesTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "delete": "available",
              "hide": "available",
              "like": "available",
              "read": "available",
              "reply": "available",
              "withdraw": "available"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/channels/channelId/abilities")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Inbox.GetAbilitiesAsync(
            new GetAbilitiesInboxRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "delete": "available",
              "hide": "available",
              "like": "available",
              "read": "available",
              "reply": "available",
              "withdraw": "available"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/channels/channelId/abilities")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Inbox.GetAbilitiesAsync(
            new GetAbilitiesInboxRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
