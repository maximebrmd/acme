using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Webhooks;

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
                "description": "description",
                "disabledAt": "disabledAt",
                "disabledReason": "manual",
                "enabled": true,
                "eventTypes": [
                  "post.scheduled",
                  "post.scheduled"
                ],
                "failingSince": "failingSince",
                "id": "id",
                "previousSecretExpiresAt": "previousSecretExpiresAt",
                "scope": "workspace",
                "updatedAt": "updatedAt",
                "url": "url"
              },
              {
                "createdAt": "createdAt",
                "description": "description",
                "disabledAt": "disabledAt",
                "disabledReason": "manual",
                "enabled": true,
                "eventTypes": [
                  "post.scheduled",
                  "post.scheduled"
                ],
                "failingSince": "failingSince",
                "id": "id",
                "previousSecretExpiresAt": "previousSecretExpiresAt",
                "scope": "workspace",
                "updatedAt": "updatedAt",
                "url": "url"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/webhooks")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Webhooks.ListAsync(
            new ListWebhooksRequest { WorkspaceId = "workspaceId" }
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
                "description": "description",
                "disabledAt": "disabledAt",
                "disabledReason": "manual",
                "enabled": true,
                "eventTypes": [
                  "post.scheduled"
                ],
                "failingSince": "failingSince",
                "id": "id",
                "previousSecretExpiresAt": "previousSecretExpiresAt",
                "scope": "workspace",
                "updatedAt": "updatedAt",
                "url": "url"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/webhooks")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Webhooks.ListAsync(
            new ListWebhooksRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
