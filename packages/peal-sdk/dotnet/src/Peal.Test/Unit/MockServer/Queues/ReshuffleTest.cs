using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Queues;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ReshuffleTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "moved": 1,
              "remaining": 1,
              "stoppedBy": "planLimit",
              "unchanged": 1
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/queues/queueId/reshuffle")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Queues.ReshuffleAsync(
            new ReshuffleQueuesRequest { WorkspaceId = "workspaceId", QueueId = "queueId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "moved": 1,
              "remaining": 1,
              "stoppedBy": "planLimit",
              "unchanged": 1
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/queues/queueId/reshuffle")
                    .UsingPost()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Queues.ReshuffleAsync(
            new ReshuffleQueuesRequest { WorkspaceId = "workspaceId", QueueId = "queueId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
