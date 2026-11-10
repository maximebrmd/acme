using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Webhooks;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SendTestTest : BaseMockServerTest
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
              "error": "timeout",
              "eventId": "eventId",
              "eventType": "post.scheduled",
              "failureReason": "exhausted",
              "id": "id",
              "lastAttemptAt": "lastAttemptAt",
              "nextAttemptAt": "nextAttemptAt",
              "responseExcerpt": "responseExcerpt",
              "responseStatus": 1,
              "status": "pending"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/webhooks/endpointId/test")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Webhooks.SendTestAsync(
            new SendTestWebhooksRequest { WorkspaceId = "workspaceId", EndpointId = "endpointId" }
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
              "error": "timeout",
              "eventId": "eventId",
              "eventType": "post.scheduled",
              "failureReason": "exhausted",
              "id": "id",
              "lastAttemptAt": "lastAttemptAt",
              "nextAttemptAt": "nextAttemptAt",
              "responseExcerpt": "responseExcerpt",
              "responseStatus": 1,
              "status": "pending"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/webhooks/endpointId/test")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Webhooks.SendTestAsync(
            new SendTestWebhooksRequest { WorkspaceId = "workspaceId", EndpointId = "endpointId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
