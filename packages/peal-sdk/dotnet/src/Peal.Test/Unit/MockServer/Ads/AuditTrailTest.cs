using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Ads;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class AuditTrailTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "entries": [
                {
                  "accountId": "accountId",
                  "action": "accountConnected",
                  "amounts": {
                    "amounts": 1000000
                  },
                  "at": "at",
                  "boostId": "boostId",
                  "by": {
                    "id": "id",
                    "kind": "user",
                    "viaClient": "viaClient"
                  },
                  "currency": "currency",
                  "id": "id"
                },
                {
                  "accountId": "accountId",
                  "action": "accountConnected",
                  "amounts": {
                    "amounts": 1000000
                  },
                  "at": "at",
                  "boostId": "boostId",
                  "by": {
                    "id": "id",
                    "kind": "user",
                    "viaClient": "viaClient"
                  },
                  "currency": "currency",
                  "id": "id"
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/audit")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.AuditTrailAsync(
            new AuditTrailAdsRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "entries": [
                {
                  "accountId": "accountId",
                  "action": "accountConnected",
                  "amounts": {
                    "key": 1000000
                  },
                  "at": "at",
                  "boostId": "boostId",
                  "by": {
                    "id": "id",
                    "kind": "user"
                  },
                  "currency": "currency",
                  "id": "id"
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/audit")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.AuditTrailAsync(
            new AuditTrailAdsRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
