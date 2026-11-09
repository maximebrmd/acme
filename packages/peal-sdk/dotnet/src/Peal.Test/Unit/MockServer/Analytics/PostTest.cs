using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Analytics;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class PostTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "postId": "postId",
              "targets": [
                {
                  "channelId": "channelId",
                  "collecting": true,
                  "lastCollectedAt": "lastCollectedAt",
                  "latest": {
                    "impressions": 1,
                    "likes": 1,
                    "quotes": 1,
                    "replies": 1,
                    "reposts": 1
                  },
                  "permalink": "permalink",
                  "publishedAt": "publishedAt",
                  "snapshots": [
                    {
                      "collectedAt": "collectedAt",
                      "metrics": {
                        "impressions": 1,
                        "likes": 1,
                        "quotes": 1,
                        "replies": 1,
                        "reposts": 1
                      }
                    },
                    {
                      "collectedAt": "collectedAt",
                      "metrics": {
                        "impressions": 1,
                        "likes": 1,
                        "quotes": 1,
                        "replies": 1,
                        "reposts": 1
                      }
                    }
                  ],
                  "targetId": "targetId"
                },
                {
                  "channelId": "channelId",
                  "collecting": true,
                  "lastCollectedAt": "lastCollectedAt",
                  "latest": {
                    "impressions": 1,
                    "likes": 1,
                    "quotes": 1,
                    "replies": 1,
                    "reposts": 1
                  },
                  "permalink": "permalink",
                  "publishedAt": "publishedAt",
                  "snapshots": [
                    {
                      "collectedAt": "collectedAt",
                      "metrics": {
                        "impressions": 1,
                        "likes": 1,
                        "quotes": 1,
                        "replies": 1,
                        "reposts": 1
                      }
                    },
                    {
                      "collectedAt": "collectedAt",
                      "metrics": {
                        "impressions": 1,
                        "likes": 1,
                        "quotes": 1,
                        "replies": 1,
                        "reposts": 1
                      }
                    }
                  ],
                  "targetId": "targetId"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/analytics/posts/postId")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Analytics.PostAsync(
            new PostAnalyticsRequest { WorkspaceId = "workspaceId", PostId = "postId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "postId": "postId",
              "targets": [
                {
                  "channelId": "channelId",
                  "collecting": true,
                  "lastCollectedAt": "lastCollectedAt",
                  "latest": {
                    "likes": 1,
                    "replies": 1,
                    "reposts": 1
                  },
                  "permalink": "permalink",
                  "publishedAt": "publishedAt",
                  "snapshots": [
                    {
                      "collectedAt": "collectedAt",
                      "metrics": {
                        "likes": 1,
                        "replies": 1,
                        "reposts": 1
                      }
                    }
                  ],
                  "targetId": "targetId"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/analytics/posts/postId")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Analytics.PostAsync(
            new PostAnalyticsRequest { WorkspaceId = "workspaceId", PostId = "postId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
