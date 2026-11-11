using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Webhooks;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListDeliveriesTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "items": [
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
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/webhooks/endpointId/deliveries")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Webhooks.ListDeliveriesAsync(
            new ListDeliveriesWebhooksRequest
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
              "items": [
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
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/webhooks/endpointId/deliveries")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Webhooks.ListDeliveriesAsync(
            new ListDeliveriesWebhooksRequest
            {
                WorkspaceId = "workspaceId",
                EndpointId = "endpointId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
