using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.PartnerAccount;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListWorkspacesTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "next": "next",
              "total": 1,
              "workspaces": [
                {
                  "channels": 1,
                  "createdAt": "createdAt",
                  "externalId": "externalId",
                  "id": "id",
                  "name": "name"
                },
                {
                  "channels": 1,
                  "createdAt": "createdAt",
                  "externalId": "externalId",
                  "id": "id",
                  "name": "name"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/partner/workspaces")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.PartnerAccount.ListWorkspacesAsync(
            new ListWorkspacesPartnerAccountRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "next": "next",
              "total": 1,
              "workspaces": [
                {
                  "channels": 1,
                  "createdAt": "createdAt",
                  "externalId": "externalId",
                  "id": "id",
                  "name": "name"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/partner/workspaces")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.PartnerAccount.ListWorkspacesAsync(
            new ListWorkspacesPartnerAccountRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
