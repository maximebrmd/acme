using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Ads;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListAccountsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            [
              {
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
              {
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
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/accounts")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.ListAccountsAsync(
            new ListAccountsAdsRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            [
              {
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
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/accounts")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.ListAccountsAsync(
            new ListAccountsAdsRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
