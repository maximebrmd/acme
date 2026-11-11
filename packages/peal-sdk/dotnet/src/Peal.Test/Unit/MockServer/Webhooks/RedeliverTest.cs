using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Webhooks;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RedeliverTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "attempts": 1,
              "completedAt": "completedAt",
              "createdAt": "createdAt",
              "durationMs": 1,
              "endpointId": "endpointId",
              "error": "timeout",
              "eventId": "eventId",
              "eventType": "post.scheduled",
              "failureReason": "exhausted",
              "id": "id",
              "lastAttemptAt": "lastAttemptAt",
              "nextAttemptAt": "nextAttemptAt",
              "redeliveryOf": "redeliveryOf",
              "responseExcerpt": "responseExcerpt",
              "responseStatus": 1,
              "status": "pending",
              "workspaceExternalId": "workspaceExternalId",
              "workspaceId": "workspaceId"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/api/workspaces/workspaceId/webhooks/endpointId/deliveries/deliveryId/redeliver"
                    )
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Webhooks.RedeliverAsync(
            new RedeliverWebhooksRequest
            {
                WorkspaceId = "workspaceId",
                EndpointId = "endpointId",
                DeliveryId = "deliveryId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "attempts": 1,
              "completedAt": "completedAt",
              "createdAt": "createdAt",
              "durationMs": 1,
              "endpointId": "endpointId",
              "error": "timeout",
              "eventId": "eventId",
              "eventType": "post.scheduled",
              "failureReason": "exhausted",
              "id": "id",
              "lastAttemptAt": "lastAttemptAt",
              "nextAttemptAt": "nextAttemptAt",
              "redeliveryOf": "redeliveryOf",
              "responseExcerpt": "responseExcerpt",
              "responseStatus": 1,
              "status": "pending",
              "workspaceExternalId": "workspaceExternalId",
              "workspaceId": "workspaceId"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath(
                        "/api/workspaces/workspaceId/webhooks/endpointId/deliveries/deliveryId/redeliver"
                    )
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Webhooks.RedeliverAsync(
            new RedeliverWebhooksRequest
            {
                WorkspaceId = "workspaceId",
                EndpointId = "endpointId",
                DeliveryId = "deliveryId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
