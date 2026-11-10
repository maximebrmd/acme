using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.PartnerAccount;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateKeyTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "name": "x",
              "permissions": [
                "analytics:read",
                "analytics:read"
              ],
              "scopes": [
                "workspaces:read",
                "workspaces:read"
              ]
            }
            """;

        const string mockResponse = """
            {
              "key": "key",
              "partnerKey": {
                "createdAt": "createdAt",
                "expiresAt": "expiresAt",
                "id": "id",
                "name": "name",
                "permissions": [
                  "analytics:read",
                  "analytics:read"
                ],
                "scopes": [
                  "workspaces:read",
                  "workspaces:read"
                ],
                "start": "start"
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/partner/keys")
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

        var response = await Client.PartnerAccount.CreateKeyAsync(
            new NewPartnerKey
            {
                WorkspaceId = "workspaceId",
                ExpiresInDays = null,
                Name = "x",
                Permissions = new List<Permission>()
                {
                    Permission.AnalyticsRead,
                    Permission.AnalyticsRead,
                },
                Scopes = new List<PartnerScope>()
                {
                    PartnerScope.WorkspacesRead,
                    PartnerScope.WorkspacesRead,
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
                "analytics:read"
              ],
              "scopes": [
                "workspaces:read"
              ]
            }
            """;

        const string mockResponse = """
            {
              "key": "key",
              "partnerKey": {
                "createdAt": "createdAt",
                "expiresAt": "expiresAt",
                "id": "id",
                "name": "name",
                "permissions": [
                  "analytics:read"
                ],
                "scopes": [
                  "workspaces:read"
                ],
                "start": "start"
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/partner/keys")
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

        var response = await Client.PartnerAccount.CreateKeyAsync(
            new NewPartnerKey
            {
                WorkspaceId = "workspaceId",
                Name = "name",
                Permissions = new List<Permission>() { Permission.AnalyticsRead },
                Scopes = new List<PartnerScope>() { PartnerScope.WorkspacesRead },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
