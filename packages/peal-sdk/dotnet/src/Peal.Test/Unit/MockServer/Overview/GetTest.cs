using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Overview;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "generatedAt": "generatedAt",
              "nextCursor": "nextCursor",
              "workspaces": [
                {
                  "channels": {
                    "connected": 1,
                    "off": 1,
                    "toReconnect": 1
                  },
                  "id": "id",
                  "inbox": {
                    "unanswered": 1
                  },
                  "name": "name",
                  "overPlan": true,
                  "posts": {
                    "awaitingApproval": 1,
                    "failedLast7Days": 1,
                    "mayApprove": true,
                    "scheduledNext7Days": 1,
                    "unconfirmedLast7Days": 1
                  },
                  "refused": "twoStepRequired",
                  "role": "role",
                  "slug": "slug"
                },
                {
                  "channels": {
                    "connected": 1,
                    "off": 1,
                    "toReconnect": 1
                  },
                  "id": "id",
                  "inbox": {
                    "unanswered": 1
                  },
                  "name": "name",
                  "overPlan": true,
                  "posts": {
                    "awaitingApproval": 1,
                    "failedLast7Days": 1,
                    "mayApprove": true,
                    "scheduledNext7Days": 1,
                    "unconfirmedLast7Days": 1
                  },
                  "refused": "twoStepRequired",
                  "role": "role",
                  "slug": "slug"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/api/me/overview").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Overview.GetAsync(new GetOverviewRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "generatedAt": "generatedAt",
              "nextCursor": "nextCursor",
              "workspaces": [
                {
                  "channels": {
                    "connected": 1,
                    "off": 1,
                    "toReconnect": 1
                  },
                  "id": "id",
                  "inbox": {
                    "unanswered": 1
                  },
                  "name": "name",
                  "overPlan": true,
                  "posts": {
                    "awaitingApproval": 1,
                    "failedLast7Days": 1,
                    "mayApprove": true,
                    "scheduledNext7Days": 1,
                    "unconfirmedLast7Days": 1
                  },
                  "refused": "twoStepRequired",
                  "role": "role",
                  "slug": "slug"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock.RequestBuilders.Request.Create().WithPath("/api/me/overview").UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Overview.GetAsync(new GetOverviewRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }
}
