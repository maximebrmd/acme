using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Queues;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SlotsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "nextFree": "nextFree",
              "noRoom": "noSlots",
              "slots": [
                {
                  "at": "at",
                  "postId": "postId"
                },
                {
                  "at": "at",
                  "postId": "postId"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/queues/queueId/slots")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Queues.SlotsAsync(
            new SlotsQueuesRequest { WorkspaceId = "workspaceId", QueueId = "queueId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "nextFree": "nextFree",
              "noRoom": "noSlots",
              "slots": [
                {
                  "at": "at",
                  "postId": "postId"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/queues/queueId/slots")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Queues.SlotsAsync(
            new SlotsQueuesRequest { WorkspaceId = "workspaceId", QueueId = "queueId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
