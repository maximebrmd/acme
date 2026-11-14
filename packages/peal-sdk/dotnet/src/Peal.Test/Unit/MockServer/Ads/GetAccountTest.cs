using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Ads;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetAccountTest : BaseMockServerTest
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
              "committedThisMonth": 1000000
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/accounts/accountId")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.GetAccountAsync(
            new GetAccountAdsRequest { WorkspaceId = "workspaceId", AccountId = "accountId" }
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
              "committedThisMonth": 1000000
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/accounts/accountId")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.GetAccountAsync(
            new GetAccountAdsRequest { WorkspaceId = "workspaceId", AccountId = "accountId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
