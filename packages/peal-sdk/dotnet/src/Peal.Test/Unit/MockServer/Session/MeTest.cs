using NUnit.Framework;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Session;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class MeTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "impersonatedBy": "impersonatedBy",
              "user": {
                "email": "email",
                "emailVerified": true,
                "id": "id",
                "image": "image",
                "locale": "en",
                "name": "name"
              },
              "workspaces": [
                {
                  "id": "id",
                  "name": "name",
                  "permissions": [
                    "activity:read",
                    "activity:read"
                  ],
                  "role": "role",
                  "slug": "slug"
                },
                {
                  "id": "id",
                  "name": "name",
                  "permissions": [
                    "activity:read",
                    "activity:read"
                  ],
                  "role": "role",
                  "slug": "slug"
                }
              ]
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/api/me").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Session.MeAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "impersonatedBy": "impersonatedBy",
              "user": {
                "email": "email",
                "emailVerified": true,
                "id": "id",
                "image": "image",
                "locale": "en",
                "name": "name"
              },
              "workspaces": [
                {
                  "id": "id",
                  "name": "name",
                  "permissions": [
                    "activity:read"
                  ],
                  "role": "role",
                  "slug": "slug"
                }
              ]
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/api/me").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Session.MeAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }
}
