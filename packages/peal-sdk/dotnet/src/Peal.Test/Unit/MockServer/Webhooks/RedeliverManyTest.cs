using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Webhooks;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RedeliverManyTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "deliveryIds": [
                "deliveryIds",
                "deliveryIds"
              ]
            }
            """;

        const string mockResponse = """
            {
              "redelivered": [
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
                },
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
              ],
              "remaining": 1,
              "skipped": [
                {
                  "deliveryId": "deliveryId",
                  "reason": "alreadySent"
                },
                {
                  "deliveryId": "deliveryId",
                  "reason": "alreadySent"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/webhooks/deliveries/redeliver")
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

        var response = await Client.Webhooks.RedeliverManyAsync(
            new RedeliverManyWebhooksRequest
            {
                WorkspaceId = "workspaceId",
                Body = new WebhookRedeliveryByIds
                {
                    DeliveryIds = new List<string>() { "deliveryIds", "deliveryIds" },
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
              "deliveryIds": [
                "deliveryIds"
              ]
            }
            """;

        const string mockResponse = """
            {
              "redelivered": [
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
              ],
              "remaining": 1,
              "skipped": [
                {
                  "deliveryId": "deliveryId",
                  "reason": "alreadySent"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/webhooks/deliveries/redeliver")
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

        var response = await Client.Webhooks.RedeliverManyAsync(
            new RedeliverManyWebhooksRequest
            {
                WorkspaceId = "workspaceId",
                Body = new WebhookRedeliveryByIds
                {
                    DeliveryIds = new List<string>() { "deliveryIds" },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
