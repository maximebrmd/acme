using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;

namespace Peal.Test.Unit.MockServer.Ads;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class DisconnectTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public void MockServerTest_1()
    {
        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/connections/connectionId")
                    .UsingDelete()
            )
            .RespondWith(WireMock.ResponseBuilders.Response.Create().WithStatusCode(200));

        Assert.DoesNotThrowAsync(async () =>
            await Client.Ads.DisconnectAsync(
                new DisconnectAdsRequest
                {
                    WorkspaceId = "workspaceId",
                    ConnectionId = "connectionId",
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
                    .WithPath("/api/workspaces/workspaceId/ads/connections/connectionId")
                    .UsingDelete()
            )
            .RespondWith(WireMock.ResponseBuilders.Response.Create().WithStatusCode(200));

        Assert.DoesNotThrowAsync(async () =>
            await Client.Ads.DisconnectAsync(
                new DisconnectAdsRequest
                {
                    WorkspaceId = "workspaceId",
                    ConnectionId = "connectionId",
                }
            )
        );
    }
}
