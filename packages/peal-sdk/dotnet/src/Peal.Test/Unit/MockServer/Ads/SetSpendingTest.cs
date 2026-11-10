using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Ads;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SetSpendingTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "enabled": true
            }
            """;

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
              "committedThisMonth": 1000000
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/accounts/accountId/spending")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPut()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.SetSpendingAsync(
            new AdSpendingDecision
            {
                WorkspaceId = "workspaceId",
                AccountId = "accountId",
                Enabled = true,
                MonthlyCeiling = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "enabled": true
            }
            """;

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
              "committedThisMonth": 1000000
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/accounts/accountId/spending")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPut()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.SetSpendingAsync(
            new AdSpendingDecision
            {
                WorkspaceId = "workspaceId",
                AccountId = "accountId",
                Enabled = true,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
