using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Webhooks;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "eventTypes": [
                "post.scheduled",
                "post.scheduled"
              ],
              "url": "x"
            }
            """;

        const string mockResponse = """
            {
              "endpoint": {
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
                "updatedAt": "updatedAt",
                "url": "url"
              },
              "secret": "secret"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/webhooks")
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

        var response = await Client.Webhooks.CreateAsync(
            new NewWebhookEndpoint
            {
                WorkspaceId = "workspaceId",
                Description = null,
                Enabled = null,
                EventTypes = new List<SubscribableWebhookEventType>()
                {
                    SubscribableWebhookEventType.PostScheduled,
                    SubscribableWebhookEventType.PostScheduled,
                },
                Url = "x",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "eventTypes": [
                "post.scheduled"
              ],
              "url": "url"
            }
            """;

        const string mockResponse = """
            {
              "endpoint": {
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
                "updatedAt": "updatedAt",
                "url": "url"
              },
              "secret": "secret"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/webhooks")
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

        var response = await Client.Webhooks.CreateAsync(
            new NewWebhookEndpoint
            {
                WorkspaceId = "workspaceId",
                EventTypes = new List<SubscribableWebhookEventType>()
                {
                    SubscribableWebhookEventType.PostScheduled,
                },
                Url = "url",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
