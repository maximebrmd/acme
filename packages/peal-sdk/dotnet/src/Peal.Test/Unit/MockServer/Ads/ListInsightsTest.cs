using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Ads;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListInsightsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "account": {
                "access": "working",
                "amountSpent": 1000000,
                "connectedAt": "connectedAt",
                "connectionId": "connectionId",
                "currency": "currency",
                "externalId": "externalId",
                "id": "id",
                "minorUnitDigits": 1.1,
                "monthlyCeiling": 1000000,
                "name": "name",
                "network": "meta",
                "newAdsUntrackedUntil": "newAdsUntrackedUntil",
                "spendCap": 1000000,
                "spendingEnabled": true,
                "status": "active",
                "syncedAt": "syncedAt",
                "timeZone": "timeZone"
              },
              "from": "from",
              "rows": [
                {
                  "day": "day",
                  "totals": {
                    "clicks": 1000000,
                    "impressions": 1000000,
                    "reach": 1000000,
                    "results": 1000000,
                    "spend": 1000000
                  }
                },
                {
                  "day": "day",
                  "totals": {
                    "clicks": 1000000,
                    "impressions": 1000000,
                    "reach": 1000000,
                    "results": 1000000,
                    "spend": 1000000
                  }
                }
              ],
              "to": "to"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/accounts/accountId/insights")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.ListInsightsAsync(
            new ListInsightsAdsRequest { WorkspaceId = "workspaceId", AccountId = "accountId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "account": {
                "access": "working",
                "amountSpent": 1000000,
                "connectedAt": "connectedAt",
                "connectionId": "connectionId",
                "currency": "currency",
                "externalId": "externalId",
                "id": "id",
                "minorUnitDigits": 1.1,
                "monthlyCeiling": 1000000,
                "name": "name",
                "network": "meta",
                "newAdsUntrackedUntil": "newAdsUntrackedUntil",
                "spendCap": 1000000,
                "spendingEnabled": true,
                "status": "active",
                "syncedAt": "syncedAt",
                "timeZone": "timeZone"
              },
              "from": "from",
              "rows": [
                {
                  "day": "day",
                  "totals": {
                    "clicks": 1000000,
                    "impressions": 1000000,
                    "reach": 1000000,
                    "spend": 1000000
                  }
                }
              ],
              "to": "to"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/accounts/accountId/insights")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.ListInsightsAsync(
            new ListInsightsAdsRequest { WorkspaceId = "workspaceId", AccountId = "accountId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
