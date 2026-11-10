using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Ads;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class StopBoostTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "accountId": "accountId",
              "audience": {
                "ageMax": 65,
                "ageMin": 65,
                "countries": [
                  "countries",
                  "countries"
                ]
              },
              "beneficiary": "beneficiary",
              "budget": {
                "amount": 1000000,
                "kind": "total"
              },
              "channelId": "channelId",
              "committed": 1000000,
              "createdAt": "createdAt",
              "currency": "currency",
              "endsAt": "endsAt",
              "failureReason": "accountUnusable",
              "id": "id",
              "networkCode": "networkCode",
              "objective": "engagement",
              "payer": "payer",
              "platform": "facebook",
              "postId": "postId",
              "startsAt": "startsAt",
              "state": "requested",
              "stateAt": "stateAt",
              "updatedAt": "updatedAt"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/boosts/boostId/stop")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.StopBoostAsync(
            new StopBoostAdsRequest { WorkspaceId = "workspaceId", BoostId = "boostId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "accountId": "accountId",
              "audience": {
                "ageMax": 1,
                "ageMin": 1,
                "countries": [
                  "countries"
                ]
              },
              "beneficiary": "beneficiary",
              "budget": {
                "amount": 1000000,
                "kind": "total"
              },
              "channelId": "channelId",
              "committed": 1000000,
              "createdAt": "createdAt",
              "currency": "currency",
              "endsAt": "endsAt",
              "failureReason": "accountUnusable",
              "id": "id",
              "networkCode": "networkCode",
              "objective": "engagement",
              "payer": "payer",
              "platform": "facebook",
              "postId": "postId",
              "startsAt": "startsAt",
              "state": "requested",
              "stateAt": "stateAt",
              "updatedAt": "updatedAt"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/boosts/boostId/stop")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.StopBoostAsync(
            new StopBoostAdsRequest { WorkspaceId = "workspaceId", BoostId = "boostId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
