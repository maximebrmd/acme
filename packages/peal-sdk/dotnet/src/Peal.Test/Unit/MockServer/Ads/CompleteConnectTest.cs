using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Ads;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CompleteConnectTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "state": "state"
            }
            """;

        const string mockResponse = """
            {
              "accounts": [
                {
                  "connected": true,
                  "currency": "currency",
                  "externalId": "externalId",
                  "name": "name",
                  "spendCap": 1000000,
                  "status": "active",
                  "timeZone": "timeZone",
                  "unsupported": "timeZoneUnknown"
                },
                {
                  "connected": true,
                  "currency": "currency",
                  "externalId": "externalId",
                  "name": "name",
                  "spendCap": 1000000,
                  "status": "active",
                  "timeZone": "timeZone",
                  "unsupported": "timeZoneUnknown"
                }
              ],
              "connection": {
                "access": "working",
                "createdAt": "createdAt",
                "expiresAt": "expiresAt",
                "grantedBy": "grantedBy",
                "id": "id",
                "maySpend": true,
                "network": "meta"
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/connections/meta/callback")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPost()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.CompleteConnectAsync(
            new AdSignInCallback
            {
                WorkspaceId = "workspaceId",
                Network = AdNetwork.Meta,
                Code = null,
                Error = null,
                State = "state",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "state": "state"
            }
            """;

        const string mockResponse = """
            {
              "accounts": [
                {
                  "connected": true,
                  "currency": "currency",
                  "externalId": "externalId",
                  "name": "name",
                  "spendCap": 1000000,
                  "status": "active",
                  "timeZone": "timeZone",
                  "unsupported": "timeZoneUnknown"
                }
              ],
              "connection": {
                "access": "working",
                "createdAt": "createdAt",
                "expiresAt": "expiresAt",
                "grantedBy": "grantedBy",
                "id": "id",
                "maySpend": true,
                "network": "meta"
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/connections/meta/callback")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPost()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.CompleteConnectAsync(
            new AdSignInCallback
            {
                WorkspaceId = "workspaceId",
                Network = AdNetwork.Meta,
                State = "state",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
