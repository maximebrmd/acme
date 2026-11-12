using NUnit.Framework;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Credential;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "_tag": "user",
              "application": {
                "clientId": "clientId",
                "scopes": [
                  "scopes",
                  "scopes"
                ],
                "workspace": {
                  "id": "id",
                  "name": "name",
                  "permissions": [
                    "activity:read",
                    "activity:read"
                  ],
                  "refused": "twoStepRequired"
                }
              },
              "userId": "userId"
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/api/credential").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Credential.GetAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "_tag": "user",
              "application": {
                "clientId": "clientId",
                "scopes": [
                  "scopes"
                ],
                "workspace": {
                  "id": "id",
                  "name": "name",
                  "permissions": [
                    "activity:read"
                  ],
                  "refused": "twoStepRequired"
                }
              },
              "userId": "userId"
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/api/credential").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Credential.GetAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }
}
