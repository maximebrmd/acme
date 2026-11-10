using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Ads;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListConnectionsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            [
              {
                "access": "working",
                "createdAt": "createdAt",
                "expiresAt": "expiresAt",
                "grantedBy": "grantedBy",
                "id": "id",
                "maySpend": true,
                "network": "meta"
              },
              {
                "access": "working",
                "createdAt": "createdAt",
                "expiresAt": "expiresAt",
                "grantedBy": "grantedBy",
                "id": "id",
                "maySpend": true,
                "network": "meta"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/connections")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.ListConnectionsAsync(
            new ListConnectionsAdsRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            [
              {
                "access": "working",
                "createdAt": "createdAt",
                "expiresAt": "expiresAt",
                "grantedBy": "grantedBy",
                "id": "id",
                "maySpend": true,
                "network": "meta"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/ads/connections")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Ads.ListConnectionsAsync(
            new ListConnectionsAdsRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
