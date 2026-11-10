using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Analytics;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ChannelTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "channelId": "channelId",
              "days": [
                {
                  "date": "date",
                  "followers": 1,
                  "following": 1,
                  "likes": 1,
                  "posts": 1,
                  "quotes": 1,
                  "reach": 1,
                  "replies": 1,
                  "reposts": 1,
                  "views": 1
                },
                {
                  "date": "date",
                  "followers": 1,
                  "following": 1,
                  "likes": 1,
                  "posts": 1,
                  "quotes": 1,
                  "reach": 1,
                  "replies": 1,
                  "reposts": 1,
                  "views": 1
                }
              ],
              "followers": {
                "current": 1,
                "gained": 1
              },
              "from": "from",
              "platform": "x",
              "timeZone": "timeZone",
              "to": "to",
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
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/analytics/channels/channelId")
                    .WithParam("timeZone", "timeZone")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Analytics.ChannelAsync(
            new ChannelAnalyticsRequest
            {
                WorkspaceId = "workspaceId",
                ChannelId = "channelId",
                TimeZone = "timeZone",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "channelId": "channelId",
              "days": [
                {
                  "date": "date",
                  "followers": 1,
                  "following": 1,
                  "likes": 1,
                  "posts": 1,
                  "quotes": 1,
                  "reach": 1,
                  "replies": 1,
                  "reposts": 1,
                  "views": 1
                }
              ],
              "followers": {
                "current": 1,
                "gained": 1
              },
              "from": "from",
              "platform": "x",
              "timeZone": "timeZone",
              "to": "to",
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
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/analytics/channels/channelId")
                    .WithParam("timeZone", "timeZone")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Analytics.ChannelAsync(
            new ChannelAnalyticsRequest
            {
                WorkspaceId = "workspaceId",
                ChannelId = "channelId",
                TimeZone = "timeZone",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
