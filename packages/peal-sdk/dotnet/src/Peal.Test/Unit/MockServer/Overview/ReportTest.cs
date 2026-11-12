using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Overview;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ReportTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "from": "from",
              "nextCursor": "nextCursor",
              "previous": {
                "from": "from",
                "to": "to"
              },
              "timeZone": "timeZone",
              "to": "to",
              "workspaces": [
                {
                  "analytics": {
                    "followers": {
                      "current": 1,
                      "gained": 1
                    },
                    "previousFollowers": {
                      "current": 1,
                      "gained": 1
                    },
                    "previousKept": true,
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
                    }
                  },
                  "id": "id",
                  "name": "name",
                  "refused": "twoStepRequired",
                  "role": "role",
                  "slug": "slug"
                },
                {
                  "analytics": {
                    "followers": {
                      "current": 1,
                      "gained": 1
                    },
                    "previousFollowers": {
                      "current": 1,
                      "gained": 1
                    },
                    "previousKept": true,
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
                    }
                  },
                  "id": "id",
                  "name": "name",
                  "refused": "twoStepRequired",
                  "role": "role",
                  "slug": "slug"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/me/report")
                    .WithParam("timeZone", "timeZone")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Overview.ReportAsync(
            new ReportOverviewRequest { TimeZone = "timeZone" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "from": "from",
              "nextCursor": "nextCursor",
              "previous": {
                "from": "from",
                "to": "to"
              },
              "timeZone": "timeZone",
              "to": "to",
              "workspaces": [
                {
                  "analytics": {
                    "followers": {},
                    "previousFollowers": {},
                    "previousKept": true,
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
                    }
                  },
                  "id": "id",
                  "name": "name",
                  "refused": "twoStepRequired",
                  "role": "role",
                  "slug": "slug"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/me/report")
                    .WithParam("timeZone", "timeZone")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Overview.ReportAsync(
            new ReportOverviewRequest { TimeZone = "timeZone" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
