using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Analytics;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class DashboardTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "followers": {
                "current": 1,
                "gained": 1
              },
              "previousFollowers": {
                "current": 1,
                "gained": 1
              },
              "previousTotals": {
                "clicks": 1,
                "engagement": 1,
                "impressions": 1,
                "likes": 1,
                "posts": 1,
                "quotes": 1,
                "reach": 1,
                "replies": 1,
                "reposts": 1,
                "saves": 1
              },
              "totals": {
                "clicks": 1,
                "engagement": 1,
                "impressions": 1,
                "likes": 1,
                "posts": 1,
                "quotes": 1,
                "reach": 1,
                "replies": 1,
                "reposts": 1,
                "saves": 1
              },
              "channels": [
                {
                  "followers": {
                    "current": 1,
                    "gained": 1
                  },
                  "previousFollowers": {
                    "current": 1,
                    "gained": 1
                  },
                  "previousTotals": {
                    "clicks": 1,
                    "engagement": 1,
                    "impressions": 1,
                    "likes": 1,
                    "posts": 1,
                    "quotes": 1,
                    "reach": 1,
                    "replies": 1,
                    "reposts": 1,
                    "saves": 1
                  },
                  "totals": {
                    "clicks": 1,
                    "engagement": 1,
                    "impressions": 1,
                    "likes": 1,
                    "posts": 1,
                    "quotes": 1,
                    "reach": 1,
                    "replies": 1,
                    "reposts": 1,
                    "saves": 1
                  },
                  "channelId": "channelId",
                  "platform": "x"
                },
                {
                  "followers": {
                    "current": 1,
                    "gained": 1
                  },
                  "previousFollowers": {
                    "current": 1,
                    "gained": 1
                  },
                  "previousTotals": {
                    "clicks": 1,
                    "engagement": 1,
                    "impressions": 1,
                    "likes": 1,
                    "posts": 1,
                    "quotes": 1,
                    "reach": 1,
                    "replies": 1,
                    "reposts": 1,
                    "saves": 1
                  },
                  "totals": {
                    "clicks": 1,
                    "engagement": 1,
                    "impressions": 1,
                    "likes": 1,
                    "posts": 1,
                    "quotes": 1,
                    "reach": 1,
                    "replies": 1,
                    "reposts": 1,
                    "saves": 1
                  },
                  "channelId": "channelId",
                  "platform": "x"
                }
              ],
              "days": [
                {
                  "date": "date",
                  "followers": 1,
                  "likes": 1,
                  "quotes": 1,
                  "reach": 1,
                  "replies": 1,
                  "reposts": 1,
                  "views": 1
                },
                {
                  "date": "date",
                  "followers": 1,
                  "likes": 1,
                  "quotes": 1,
                  "reach": 1,
                  "replies": 1,
                  "reposts": 1,
                  "views": 1
                }
              ],
              "from": "from",
              "platforms": [
                {
                  "followers": {
                    "current": 1,
                    "gained": 1
                  },
                  "previousFollowers": {
                    "current": 1,
                    "gained": 1
                  },
                  "previousTotals": {
                    "clicks": 1,
                    "engagement": 1,
                    "impressions": 1,
                    "likes": 1,
                    "posts": 1,
                    "quotes": 1,
                    "reach": 1,
                    "replies": 1,
                    "reposts": 1,
                    "saves": 1
                  },
                  "totals": {
                    "clicks": 1,
                    "engagement": 1,
                    "impressions": 1,
                    "likes": 1,
                    "posts": 1,
                    "quotes": 1,
                    "reach": 1,
                    "replies": 1,
                    "reposts": 1,
                    "saves": 1
                  },
                  "platform": "x"
                },
                {
                  "followers": {
                    "current": 1,
                    "gained": 1
                  },
                  "previousFollowers": {
                    "current": 1,
                    "gained": 1
                  },
                  "previousTotals": {
                    "clicks": 1,
                    "engagement": 1,
                    "impressions": 1,
                    "likes": 1,
                    "posts": 1,
                    "quotes": 1,
                    "reach": 1,
                    "replies": 1,
                    "reposts": 1,
                    "saves": 1
                  },
                  "totals": {
                    "clicks": 1,
                    "engagement": 1,
                    "impressions": 1,
                    "likes": 1,
                    "posts": 1,
                    "quotes": 1,
                    "reach": 1,
                    "replies": 1,
                    "reposts": 1,
                    "saves": 1
                  },
                  "platform": "x"
                }
              ],
              "previous": {
                "from": "from",
                "to": "to"
              },
              "timeZone": "timeZone",
              "to": "to",
              "topPosts": [
                {
                  "channelId": "channelId",
                  "engagement": 1,
                  "metrics": {
                    "clicks": 1,
                    "impressions": 1,
                    "likes": 1,
                    "quotes": 1,
                    "reach": 1,
                    "replies": 1,
                    "reposts": 1,
                    "saves": 1
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
                    "clicks": 1,
                    "impressions": 1,
                    "likes": 1,
                    "quotes": 1,
                    "reach": 1,
                    "replies": 1,
                    "reposts": 1,
                    "saves": 1
                  },
                  "permalink": "permalink",
                  "postId": "postId",
                  "publishedAt": "publishedAt",
                  "targetId": "targetId"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/analytics/dashboard")
                    .WithParam("timeZone", "timeZone")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Analytics.DashboardAsync(
            new DashboardAnalyticsRequest { WorkspaceId = "workspaceId", TimeZone = "timeZone" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "followers": {
                "current": 1,
                "gained": 1
              },
              "previousFollowers": {
                "current": 1,
                "gained": 1
              },
              "previousTotals": {
                "clicks": 1,
                "engagement": 1,
                "impressions": 1,
                "likes": 1,
                "posts": 1,
                "quotes": 1,
                "reach": 1,
                "replies": 1,
                "reposts": 1,
                "saves": 1
              },
              "totals": {
                "clicks": 1,
                "engagement": 1,
                "impressions": 1,
                "likes": 1,
                "posts": 1,
                "quotes": 1,
                "reach": 1,
                "replies": 1,
                "reposts": 1,
                "saves": 1
              },
              "channels": [
                {
                  "followers": {},
                  "previousFollowers": {},
                  "previousTotals": {
                    "engagement": 1,
                    "likes": 1,
                    "posts": 1,
                    "replies": 1,
                    "reposts": 1
                  },
                  "totals": {
                    "engagement": 1,
                    "likes": 1,
                    "posts": 1,
                    "replies": 1,
                    "reposts": 1
                  },
                  "channelId": "channelId",
                  "platform": "x"
                }
              ],
              "days": [
                {
                  "date": "date",
                  "followers": 1,
                  "likes": 1,
                  "quotes": 1,
                  "reach": 1,
                  "replies": 1,
                  "reposts": 1,
                  "views": 1
                }
              ],
              "from": "from",
              "platforms": [
                {
                  "followers": {},
                  "previousFollowers": {},
                  "previousTotals": {
                    "engagement": 1,
                    "likes": 1,
                    "posts": 1,
                    "replies": 1,
                    "reposts": 1
                  },
                  "totals": {
                    "engagement": 1,
                    "likes": 1,
                    "posts": 1,
                    "replies": 1,
                    "reposts": 1
                  },
                  "platform": "x"
                }
              ],
              "previous": {
                "from": "from",
                "to": "to"
              },
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
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/analytics/dashboard")
                    .WithParam("timeZone", "timeZone")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Analytics.DashboardAsync(
            new DashboardAnalyticsRequest { WorkspaceId = "workspaceId", TimeZone = "timeZone" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
