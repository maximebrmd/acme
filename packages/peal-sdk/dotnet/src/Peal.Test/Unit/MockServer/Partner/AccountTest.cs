using NUnit.Framework;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Partner;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class AccountTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "partner": {
                "accentColor": "accentColor",
                "createdAt": "createdAt",
                "id": "id",
                "logoUrl": "logoUrl",
                "name": "name",
                "returnOrigins": [
                  "returnOrigins",
                  "returnOrigins"
                ],
                "workspaceId": "workspaceId"
              },
              "usage": {
                "channels": 1,
                "days": [
                  {
                    "channels": 1,
                    "day": "day",
                    "workspaces": 1
                  },
                  {
                    "channels": 1,
                    "day": "day",
                    "workspaces": 1
                  }
                ],
                "workspaces": 1
              }
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/api/partner").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Partner.AccountAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "partner": {
                "accentColor": "accentColor",
                "createdAt": "createdAt",
                "id": "id",
                "logoUrl": "logoUrl",
                "name": "name",
                "returnOrigins": [
                  "returnOrigins"
                ],
                "workspaceId": "workspaceId"
              },
              "usage": {
                "channels": 1,
                "days": [
                  {
                    "channels": 1,
                    "day": "day",
                    "workspaces": 1
                  }
                ],
                "workspaces": 1
              }
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/api/partner").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Partner.AccountAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }
}
