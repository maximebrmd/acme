using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Usage;

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
                "assistantRequests": {
                  "resetsAt": "resetsAt",
                  "used": 1
                },
                "channels": 1,
                "mediaStorage": 1000000,
                "members": 1,
                "scheduledPosts": {
                  "resetsAt": "resetsAt",
                  "used": 1
                }
              },
              "days": [
                {
                  "assistantRequests": 1,
                  "billableAccounts": 1,
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
                  "mediaStorage": 1000000,
                  "members": 1,
                  "publishedPosts": 1
                },
                {
                  "assistantRequests": 1,
                  "billableAccounts": 1,
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
                  "mediaStorage": 1000000,
                  "members": 1,
                  "publishedPosts": 1
                }
              ],
              "period": {
                "from": "from",
                "to": "to"
              },
              "plan": "free",
              "sharedWith": {
                "partnerWorkspaceId": "partnerWorkspaceId"
              },
              "totals": {
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
                "publishedPosts": 1
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/usage")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Usage.GetAsync(
            new GetUsageRequest { WorkspaceId = "workspaceId" }
        );
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
                "assistantRequests": {
                  "resetsAt": "resetsAt",
                  "used": 1
                },
                "channels": 1,
                "mediaStorage": 1000000,
                "members": 1,
                "scheduledPosts": {
                  "resetsAt": "resetsAt",
                  "used": 1
                }
              },
              "days": [
                {
                  "assistantRequests": 1,
                  "billableAccounts": 1,
                  "byPlatform": [
                    {
                      "platform": "x",
                      "posts": 1
                    }
                  ],
                  "channels": 1,
                  "day": "day",
                  "mediaStorage": 1000000,
                  "members": 1,
                  "publishedPosts": 1
                }
              ],
              "period": {
                "from": "from",
                "to": "to"
              },
              "plan": "free",
              "sharedWith": {
                "partnerWorkspaceId": "partnerWorkspaceId"
              },
              "totals": {
                "billableAccountDays": 1000000,
                "byPlatform": [
                  {
                    "platform": "x",
                    "posts": 1
                  }
                ],
                "channelDays": 1000000,
                "daysCounted": 1,
                "meteredPosts": [
                  {
                    "month": "month",
                    "platform": "x",
                    "posts": 1,
                    "postsWithLinks": 1
                  }
                ],
                "publishedPosts": 1
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/usage")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Usage.GetAsync(
            new GetUsageRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
