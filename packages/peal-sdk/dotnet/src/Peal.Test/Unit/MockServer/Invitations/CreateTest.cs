using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Invitations;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "email": "email",
              "role": "owner"
            }
            """;

        const string mockResponse = """
            {
              "createdAt": "createdAt",
              "email": "email",
              "expiresAt": "expiresAt",
              "id": "id",
              "inviterId": "inviterId",
              "role": "role"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/invitations")
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

        var response = await Client.Invitations.CreateAsync(
            new NewInvitation
            {
                WorkspaceId = "workspaceId",
                Email = "email",
                Role = Role.Owner,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "email": "email",
              "role": "owner"
            }
            """;

        const string mockResponse = """
            {
              "createdAt": "createdAt",
              "email": "email",
              "expiresAt": "expiresAt",
              "id": "id",
              "inviterId": "inviterId",
              "role": "role"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/invitations")
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

        var response = await Client.Invitations.CreateAsync(
            new NewInvitation
            {
                WorkspaceId = "workspaceId",
                Email = "email",
                Role = Role.Owner,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
