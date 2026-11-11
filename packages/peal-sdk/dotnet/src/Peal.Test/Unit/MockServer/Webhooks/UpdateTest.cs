using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Webhooks;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
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
              "headerNames": [
                "headerNames",
                "headerNames"
              ],
              "id": "id",
              "previousSecretExpiresAt": "previousSecretExpiresAt",
              "scope": "workspace",
              "updatedAt": "updatedAt",
              "url": "url",
              "workspaceIds": [
                "workspaceIds",
                "workspaceIds"
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/webhooks/endpointId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Webhooks.UpdateAsync(
            new WebhookEndpointChange
            {
                WorkspaceId = "workspaceId",
                EndpointId = "endpointId",
                ChannelIds = null,
                Description = null,
                Enabled = null,
                EventTypes = null,
                Headers = null,
                Url = null,
                WorkspaceIds = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
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
              "headerNames": [
                "headerNames"
              ],
              "id": "id",
              "previousSecretExpiresAt": "previousSecretExpiresAt",
              "scope": "workspace",
              "updatedAt": "updatedAt",
              "url": "url",
              "workspaceIds": [
                "workspaceIds"
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/webhooks/endpointId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Webhooks.UpdateAsync(
            new WebhookEndpointChange { WorkspaceId = "workspaceId", EndpointId = "endpointId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
