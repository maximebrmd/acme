using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;

namespace Peal.Test.Unit.MockServer.ChannelDefaults;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ClearTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public void MockServerTest_1()
    {
        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId/default-options")
                    .UsingDelete()
            )
            .RespondWith(WireMock.ResponseBuilders.Response.Create().WithStatusCode(200));

        Assert.DoesNotThrowAsync(async () =>
            await Client.ChannelDefaults.ClearAsync(
                new ClearChannelDefaultsRequest
                {
                    WorkspaceId = "workspaceId",
                    ChannelId = "channelId",
                }
            )
        );
    }

    [NUnit.Framework.Test]
    public void MockServerTest_2()
    {
        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId/default-options")
                    .UsingDelete()
            )
            .RespondWith(WireMock.ResponseBuilders.Response.Create().WithStatusCode(200));

        Assert.DoesNotThrowAsync(async () =>
            await Client.ChannelDefaults.ClearAsync(
                new ClearChannelDefaultsRequest
                {
                    WorkspaceId = "workspaceId",
                    ChannelId = "channelId",
                }
            )
        );
    }
}
