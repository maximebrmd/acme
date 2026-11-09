using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Analytics;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SummaryTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "channels": [
                {
                  "impressions": 1,
                  "likes": 1,
                  "posts": 1,
                  "quotes": 1,
                  "replies": 1,
                  "reposts": 1,
                  "channelId": "channelId"
                },
                {
                  "impressions": 1,
                  "likes": 1,
                  "posts": 1,
                  "quotes": 1,
                  "replies": 1,
                  "reposts": 1,
                  "channelId": "channelId"
                }
              ],
              "days": [
                {
                  "date": "date",
                  "likes": 1,
                  "quotes": 1,
                  "replies": 1,
                  "reposts": 1
                },
                {
                  "date": "date",
                  "likes": 1,
                  "quotes": 1,
                  "replies": 1,
                  "reposts": 1
                }
              ],
              "from": "from",
              "timeZone": "timeZone",
              "to": "to",
              "topPosts": [
                {
                  "channelId": "channelId",
                  "engagement": 1,
                  "metrics": {
                    "impressions": 1,
                    "likes": 1,
                    "quotes": 1,
                    "replies": 1,
                    "reposts": 1
                  },
                  "permalink": "permalink",
                  "postId": "postId",
                  "publishedAt": "publishedAt",
                  "targetId": "targetId"
                },
                {
                  "channelId": "channelId",
                  "engagement": 1,
                  "metrics": {
                    "impressions": 1,
                    "likes": 1,
                    "quotes": 1,
                    "replies": 1,
                    "reposts": 1
                  },
                  "permalink": "permalink",
                  "postId": "postId",
                  "publishedAt": "publishedAt",
                  "targetId": "targetId"
                }
              ],
              "totals": {
                "impressions": 1,
                "likes": 1,
                "posts": 1,
                "quotes": 1,
                "replies": 1,
                "reposts": 1
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/analytics/summary")
                    .WithParam("from", "from")
                    .WithParam("timeZone", "timeZone")
                    .WithParam("to", "to")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Analytics.SummaryAsync(
            new SummaryAnalyticsRequest
            {
                WorkspaceId = "workspaceId",
                From = "from",
                TimeZone = "timeZone",
                To = "to",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "channels": [
                {
                  "impressions": 1,
                  "likes": 1,
                  "posts": 1,
                  "quotes": 1,
                  "replies": 1,
                  "reposts": 1,
                  "channelId": "channelId"
                }
              ],
              "days": [
                {
                  "date": "date",
                  "likes": 1,
                  "quotes": 1,
                  "replies": 1,
                  "reposts": 1
                }
              ],
              "from": "from",
              "timeZone": "timeZone",
              "to": "to",
              "topPosts": [
                {
                  "channelId": "channelId",
                  "engagement": 1,
                  "metrics": {
                    "likes": 1,
                    "replies": 1,
                    "reposts": 1
                  },
                  "permalink": "permalink",
                  "postId": "postId",
                  "publishedAt": "publishedAt",
                  "targetId": "targetId"
                }
              ],
              "totals": {
                "impressions": 1,
                "likes": 1,
                "posts": 1,
                "quotes": 1,
                "replies": 1,
                "reposts": 1
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/analytics/summary")
                    .WithParam("from", "from")
                    .WithParam("timeZone", "timeZone")
                    .WithParam("to", "to")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Analytics.SummaryAsync(
            new SummaryAnalyticsRequest
            {
                WorkspaceId = "workspaceId",
                From = "from",
                TimeZone = "timeZone",
                To = "to",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
