using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Ads;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListAdsTest : BaseMockServerTest
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
                "spendCap": 1000000,
                "spendingEnabled": true,
                "status": "active",
                "syncedAt": "syncedAt",
                "timeZone": "timeZone"
              },
              "from": "from",
              "rows": [
                {
                  "adSetExternalId": "adSetExternalId",
                  "campaignExternalId": "campaignExternalId",
                  "externalId": "externalId",
                  "name": "name",
                  "postId": "postId",
                  "rawStatus": "rawStatus",
                  "status": "active",
                  "totals": {
                    "clicks": 1000000,
                    "impressions": 1000000,
                    "reach": 1000000,
                    "results": 1000000,
                    "spend": 1000000
                  }
                },
                {
                  "adSetExternalId": "adSetExternalId",
                  "campaignExternalId": "campaignExternalId",
                  "externalId": "externalId",
                  "name": "name",
                  "postId": "postId",
                  "rawStatus": "rawStatus",
                  "status": "active",
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
                    .WithPath("/api/workspaces/workspaceId/ads/accounts/accountId/ads")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.ListAdsAsync(
            new ListAdsAdsRequest { WorkspaceId = "workspaceId", AccountId = "accountId" }
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
                "spendCap": 1000000,
                "spendingEnabled": true,
                "status": "active",
                "syncedAt": "syncedAt",
                "timeZone": "timeZone"
              },
              "from": "from",
              "rows": [
                {
                  "adSetExternalId": "adSetExternalId",
                  "campaignExternalId": "campaignExternalId",
                  "externalId": "externalId",
                  "name": "name",
                  "postId": "postId",
                  "rawStatus": "rawStatus",
                  "status": "active",
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
                    .WithPath("/api/workspaces/workspaceId/ads/accounts/accountId/ads")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.ListAdsAsync(
            new ListAdsAdsRequest { WorkspaceId = "workspaceId", AccountId = "accountId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
