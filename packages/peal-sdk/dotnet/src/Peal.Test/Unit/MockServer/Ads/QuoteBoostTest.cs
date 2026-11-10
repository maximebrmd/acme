using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Ads;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class QuoteBoostTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
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
              "budget": {
                "amount": 1000000,
                "kind": "total"
              },
              "channelId": "channelId",
              "currency": "currency",
              "endsAt": "endsAt",
              "postId": "postId",
              "specialAdCategory": "none"
            }
            """;

        const string mockResponse = """
            {
              "capRoom": 1000000,
              "ceiling": 1000000,
              "commitment": 1000000,
              "committed": 1000000,
              "currency": "currency",
              "days": 1,
              "endsAt": "endsAt",
              "minorUnitDigits": 1.1,
              "startsAt": "startsAt"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/boosts/quote")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPost()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.QuoteBoostAsync(
            new QuoteBoostAdsRequest
            {
                WorkspaceId = "workspaceId",
                Body = new NewBoost
                {
                    AccountId = "accountId",
                    Audience = new BoostAudience
                    {
                        AgeMax = 65,
                        AgeMin = 65,
                        Countries = new List<string>() { "countries", "countries" },
                    },
                    Beneficiary = null,
                    Budget = new BoostBudget { Amount = 1000000, Kind = BoostBudgetKind.Total },
                    ChannelId = "channelId",
                    Currency = "currency",
                    EndsAt = "endsAt",
                    Payer = null,
                    PostId = "postId",
                    SpecialAdCategory = SpecialAdCategory.None,
                    StartsAt = null,
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "accountId": "accountId",
              "audience": {
                "ageMax": 1,
                "ageMin": 1,
                "countries": [
                  "countries"
                ]
              },
              "budget": {
                "amount": 1000000,
                "kind": "total"
              },
              "channelId": "channelId",
              "currency": "currency",
              "endsAt": "endsAt",
              "postId": "postId",
              "specialAdCategory": "none"
            }
            """;

        const string mockResponse = """
            {
              "capRoom": 1000000,
              "ceiling": 1000000,
              "commitment": 1000000,
              "committed": 1000000,
              "currency": "currency",
              "days": 1,
              "endsAt": "endsAt",
              "minorUnitDigits": 1.1,
              "startsAt": "startsAt"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/boosts/quote")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPost()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.QuoteBoostAsync(
            new QuoteBoostAdsRequest
            {
                WorkspaceId = "workspaceId",
                Body = new NewBoost
                {
                    AccountId = "accountId",
                    Audience = new BoostAudience
                    {
                        AgeMax = 1,
                        AgeMin = 1,
                        Countries = new List<string>() { "countries" },
                    },
                    Budget = new BoostBudget { Amount = 1000000, Kind = BoostBudgetKind.Total },
                    ChannelId = "channelId",
                    Currency = "currency",
                    EndsAt = "endsAt",
                    PostId = "postId",
                    SpecialAdCategory = SpecialAdCategory.None,
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
