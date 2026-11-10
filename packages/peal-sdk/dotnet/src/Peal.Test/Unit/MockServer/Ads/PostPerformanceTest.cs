using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Ads;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class PostPerformanceTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "boosts": [
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
                },
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
              ],
              "organic": [
                {
                  "channelId": "channelId",
                  "impressions": 1,
                  "likes": 1,
                  "readAt": "readAt",
                  "replies": 1,
                  "reposts": 1
                },
                {
                  "channelId": "channelId",
                  "impressions": 1,
                  "likes": 1,
                  "readAt": "readAt",
                  "replies": 1,
                  "reposts": 1
                }
              ],
              "paid": [
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
                  "ads": 1,
                  "totals": {
                    "clicks": 1000000,
                    "impressions": 1000000,
                    "reach": 1000000,
                    "results": 1000000,
                    "spend": 1000000
                  }
                },
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
                  "ads": 1,
                  "totals": {
                    "clicks": 1000000,
                    "impressions": 1000000,
                    "reach": 1000000,
                    "results": 1000000,
                    "spend": 1000000
                  }
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/posts/postId")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.PostPerformanceAsync(
            new PostPerformanceAdsRequest { WorkspaceId = "workspaceId", PostId = "postId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "boosts": [
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
              ],
              "organic": [
                {
                  "channelId": "channelId",
                  "impressions": 1,
                  "likes": 1,
                  "readAt": "readAt",
                  "replies": 1,
                  "reposts": 1
                }
              ],
              "paid": [
                {
                  "account": {
                    "access": "working",
                    "connectedAt": "connectedAt",
                    "connectionId": "connectionId",
                    "currency": "currency",
                    "externalId": "externalId",
                    "id": "id",
                    "minorUnitDigits": 1.1,
                    "name": "name",
                    "network": "meta",
                    "spendingEnabled": true,
                    "status": "active",
                    "timeZone": "timeZone"
                  },
                  "ads": 1,
                  "totals": {
                    "clicks": 1000000,
                    "impressions": 1000000,
                    "reach": 1000000,
                    "spend": 1000000
                  }
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/posts/postId")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.PostPerformanceAsync(
            new PostPerformanceAdsRequest { WorkspaceId = "workspaceId", PostId = "postId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
