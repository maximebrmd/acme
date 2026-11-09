using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.ApiKeys;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            [
              {
                "createdAt": "createdAt",
                "expiresAt": "expiresAt",
                "id": "id",
                "name": "name",
                "permissions": [
                  "analytics:read",
                  "analytics:read"
                ],
                "start": "start"
              },
              {
                "createdAt": "createdAt",
                "expiresAt": "expiresAt",
                "id": "id",
                "name": "name",
                "permissions": [
                  "analytics:read",
                  "analytics:read"
                ],
                "start": "start"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/api-keys")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.ApiKeys.ListAsync(
            new ListApiKeysRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            [
              {
                "createdAt": "createdAt",
                "expiresAt": "expiresAt",
                "id": "id",
                "name": "name",
                "permissions": [
                  "analytics:read"
                ],
                "start": "start"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/api-keys")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.ApiKeys.ListAsync(
            new ListApiKeysRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
