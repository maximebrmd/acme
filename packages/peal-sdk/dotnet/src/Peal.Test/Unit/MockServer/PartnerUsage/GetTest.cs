using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.PartnerUsage;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "allowances": {
                "assistantRequests": 1000000,
                "channels": 1000000,
                "mediaStorage": 1000000,
                "members": 1000000,
                "scheduledPosts": 1000000
              },
              "current": {
                "channels": 1,
                "workspaces": 1
              },
              "days": [
                {
                  "byPlatform": [
                    {
                      "platform": "x",
                      "posts": 1
                    },
                    {
                      "platform": "x",
                      "posts": 1
                    }
                  ],
                  "channels": 1,
                  "day": "day",
                  "publishedPosts": 1,
                  "workspaces": 1
                },
                {
                  "byPlatform": [
                    {
                      "platform": "x",
                      "posts": 1
                    },
                    {
                      "platform": "x",
                      "posts": 1
                    }
                  ],
                  "channels": 1,
                  "day": "day",
                  "publishedPosts": 1,
                  "workspaces": 1
                }
              ],
              "period": {
                "from": "from",
                "to": "to"
              },
              "plan": "free",
              "totals": {
                "assistantImages": 1,
                "billableAccountDays": 1000000,
                "byPlatform": [
                  {
                    "platform": "x",
                    "posts": 1
                  },
                  {
                    "platform": "x",
                    "posts": 1
                  }
                ],
                "channelDays": 1000000,
                "daysCounted": 1,
                "managedAds": 1,
                "meteredPosts": [
                  {
                    "month": "month",
                    "platform": "x",
                    "posts": 1,
                    "postsWithLinks": 1
                  },
                  {
                    "month": "month",
                    "platform": "x",
                    "posts": 1,
                    "postsWithLinks": 1
                  }
                ],
                "outboundMessages": 1,
                "publishedPosts": 1
              },
              "workspaces": {
                "next": "next",
                "total": 1,
                "workspaces": [
                  {
                    "assistantImages": 1,
                    "assistantRequests": 1,
                    "byPlatform": [
                      {
                        "platform": "x",
                        "posts": 1
                      },
                      {
                        "platform": "x",
                        "posts": 1
                      }
                    ],
                    "channelDays": 1000000,
                    "channels": 1,
                    "daysCounted": 1,
                    "managedAds": 1,
                    "externalId": "externalId",
                    "home": true,
                    "mediaStorage": 1000000,
                    "meteredPosts": [
                      {
                        "month": "month",
                        "platform": "x",
                        "posts": 1,
                        "postsWithLinks": 1
                      },
                      {
                        "month": "month",
                        "platform": "x",
                        "posts": 1,
                        "postsWithLinks": 1
                      }
                    ],
                    "name": "name",
                    "outboundMessages": 1,
                    "publishedPosts": 1,
                    "workspaceId": "workspaceId"
                  },
                  {
                    "assistantImages": 1,
                    "assistantRequests": 1,
                    "byPlatform": [
                      {
                        "platform": "x",
                        "posts": 1
                      },
                      {
                        "platform": "x",
                        "posts": 1
                      }
                    ],
                    "channelDays": 1000000,
                    "channels": 1,
                    "daysCounted": 1,
                    "managedAds": 1,
                    "externalId": "externalId",
                    "home": true,
                    "mediaStorage": 1000000,
                    "meteredPosts": [
                      {
                        "month": "month",
                        "platform": "x",
                        "posts": 1,
                        "postsWithLinks": 1
                      },
                      {
                        "month": "month",
                        "platform": "x",
                        "posts": 1,
                        "postsWithLinks": 1
                      }
                    ],
                    "name": "name",
                    "outboundMessages": 1,
                    "publishedPosts": 1,
                    "workspaceId": "workspaceId"
                  }
                ]
              }
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/api/partner/usage").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.PartnerUsage.GetAsync(new GetPartnerUsageRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "allowances": {
                "assistantRequests": 1000000,
                "channels": 1000000,
                "mediaStorage": 1000000,
                "members": 1000000,
                "scheduledPosts": 1000000
              },
              "current": {
                "channels": 1,
                "workspaces": 1
              },
              "days": [
                {
                  "byPlatform": [
                    {
                      "platform": "x",
                      "posts": 1
                    }
                  ],
                  "channels": 1,
                  "day": "day",
                  "publishedPosts": 1,
                  "workspaces": 1
                }
              ],
              "period": {
                "from": "from",
                "to": "to"
              },
              "plan": "free",
              "totals": {
                "assistantImages": 1,
                "billableAccountDays": 1000000,
                "byPlatform": [
                  {
                    "platform": "x",
                    "posts": 1
                  }
                ],
                "channelDays": 1000000,
                "daysCounted": 1,
                "managedAds": 1,
                "meteredPosts": [
                  {
                    "month": "month",
                    "platform": "x",
                    "posts": 1,
                    "postsWithLinks": 1
                  }
                ],
                "outboundMessages": 1,
                "publishedPosts": 1
              },
              "workspaces": {
                "next": "next",
                "total": 1,
                "workspaces": [
                  {
                    "assistantImages": 1,
                    "assistantRequests": 1,
                    "byPlatform": [
                      {
                        "platform": "x",
                        "posts": 1
                      }
                    ],
                    "channelDays": 1000000,
                    "channels": 1,
                    "daysCounted": 1,
                    "managedAds": 1,
                    "home": true,
                    "meteredPosts": [
                      {
                        "month": "month",
                        "platform": "x",
                        "posts": 1,
                        "postsWithLinks": 1
                      }
                    ],
                    "name": "name",
                    "outboundMessages": 1,
                    "publishedPosts": 1,
                    "workspaceId": "workspaceId"
                  }
                ]
              }
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/api/partner/usage").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.PartnerUsage.GetAsync(new GetPartnerUsageRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }
}
