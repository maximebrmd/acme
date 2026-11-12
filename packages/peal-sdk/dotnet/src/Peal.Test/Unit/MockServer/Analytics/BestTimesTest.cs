using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Analytics;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class BestTimesTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "best": [
                {
                  "hour": 23,
                  "median": "Infinity",
                  "posts": 1,
                  "weekday": "monday"
                },
                {
                  "hour": 23,
                  "median": "Infinity",
                  "posts": 1,
                  "weekday": "monday"
                }
              ],
              "buckets": [
                {
                  "hour": 23,
                  "median": "Infinity",
                  "posts": 1,
                  "weekday": "monday"
                },
                {
                  "hour": 23,
                  "median": "Infinity",
                  "posts": 1,
                  "weekday": "monday"
                }
              ],
              "channelId": "channelId",
              "counted": true,
              "days": 1,
              "enough": true,
              "from": "from",
              "minimumPosts": 1,
              "minimumPostsPerHour": 1,
              "platform": "x",
              "posts": 1,
              "recent": 1,
              "timeZone": "timeZone",
              "to": "to"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/analytics/best-times")
                    .WithParam("channelId", "channelId")
                    .WithParam("timeZone", "timeZone")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Analytics.BestTimesAsync(
            new BestTimesAnalyticsRequest
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
              "best": [
                {
                  "hour": 1,
                  "median": "Infinity",
                  "posts": 1,
                  "weekday": "monday"
                }
              ],
              "buckets": [
                {
                  "hour": 1,
                  "median": "Infinity",
                  "posts": 1,
                  "weekday": "monday"
                }
              ],
              "channelId": "channelId",
              "counted": true,
              "days": 1,
              "enough": true,
              "from": "from",
              "minimumPosts": 1,
              "minimumPostsPerHour": 1,
              "platform": "x",
              "posts": 1,
              "recent": 1,
              "timeZone": "timeZone",
              "to": "to"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/analytics/best-times")
                    .WithParam("channelId", "channelId")
                    .WithParam("timeZone", "timeZone")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Analytics.BestTimesAsync(
            new BestTimesAnalyticsRequest
            {
                WorkspaceId = "workspaceId",
                ChannelId = "channelId",
                TimeZone = "timeZone",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
