using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Ads;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ReachableAccountsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            [
              {
                "connected": true,
                "currency": "currency",
                "externalId": "externalId",
                "name": "name",
                "spendCap": 1000000,
                "status": "active",
                "timeZone": "timeZone",
                "unsupported": "timeZoneUnknown"
              },
              {
                "connected": true,
                "currency": "currency",
                "externalId": "externalId",
                "name": "name",
                "spendCap": 1000000,
                "status": "active",
                "timeZone": "timeZone",
                "unsupported": "timeZoneUnknown"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/connections/connectionId/accounts")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.ReachableAccountsAsync(
            new ReachableAccountsAdsRequest
            {
                WorkspaceId = "workspaceId",
                ConnectionId = "connectionId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            [
              {
                "connected": true,
                "currency": "currency",
                "externalId": "externalId",
                "name": "name",
                "spendCap": 1000000,
                "status": "active",
                "timeZone": "timeZone",
                "unsupported": "timeZoneUnknown"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/connections/connectionId/accounts")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.ReachableAccountsAsync(
            new ReachableAccountsAdsRequest
            {
                WorkspaceId = "workspaceId",
                ConnectionId = "connectionId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
