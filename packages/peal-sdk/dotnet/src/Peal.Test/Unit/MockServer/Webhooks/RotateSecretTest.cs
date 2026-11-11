using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Webhooks;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RotateSecretTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "endpoint": {
                "channelIds": [
                  "channelIds",
                  "channelIds"
                ],
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
                "url": "url",
                "workspaceIds": [
                  "workspaceIds",
                  "workspaceIds"
                ]
              },
              "secret": "secret"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/webhooks/endpointId/secret")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Webhooks.RotateSecretAsync(
            new RotateSecretWebhooksRequest
            {
                WorkspaceId = "workspaceId",
                EndpointId = "endpointId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "endpoint": {
                "channelIds": [
                  "channelIds"
                ],
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
                "url": "url",
                "workspaceIds": [
                  "workspaceIds"
                ]
              },
              "secret": "secret"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/webhooks/endpointId/secret")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Webhooks.RotateSecretAsync(
            new RotateSecretWebhooksRequest
            {
                WorkspaceId = "workspaceId",
                EndpointId = "endpointId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
