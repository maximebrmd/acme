using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.ApiKeys;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "name": "x",
              "permissions": [
                "activity:read",
                "activity:read"
              ]
            }
            """;

        const string mockResponse = """
            {
              "apiKey": {
                "createdAt": "createdAt",
                "expiresAt": "expiresAt",
                "id": "id",
                "name": "name",
                "permissions": [
                  "activity:read",
                  "activity:read"
                ],
                "start": "start"
              },
              "key": "key"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/api-keys")
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

        var response = await Client.ApiKeys.CreateAsync(
            new NewApiKey
            {
                WorkspaceId = "workspaceId",
                ExpiresInDays = null,
                Name = "x",
                Permissions = new List<Permission>()
                {
                    Permission.ActivityRead,
                    Permission.ActivityRead,
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "name": "name",
              "permissions": [
                "activity:read"
              ]
            }
            """;

        const string mockResponse = """
            {
              "apiKey": {
                "createdAt": "createdAt",
                "expiresAt": "expiresAt",
                "id": "id",
                "name": "name",
                "permissions": [
                  "activity:read"
                ],
                "start": "start"
              },
              "key": "key"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/api-keys")
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

        var response = await Client.ApiKeys.CreateAsync(
            new NewApiKey
            {
                WorkspaceId = "workspaceId",
                Name = "name",
                Permissions = new List<Permission>() { Permission.ActivityRead },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
