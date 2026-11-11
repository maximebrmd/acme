using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Queues;

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
                "channelIds": [
                  "channelIds",
                  "channelIds"
                ],
                "channelSetId": "channelSetId",
                "createdAt": "createdAt",
                "id": "id",
                "isDefault": true,
                "name": "name",
                "slots": [
                  {
                    "day": "monday",
                    "time": "time"
                  },
                  {
                    "day": "monday",
                    "time": "time"
                  }
                ],
                "timeZone": "timeZone",
                "unavailableChannelIds": [
                  "unavailableChannelIds",
                  "unavailableChannelIds"
                ]
              },
              {
                "channelIds": [
                  "channelIds",
                  "channelIds"
                ],
                "channelSetId": "channelSetId",
                "createdAt": "createdAt",
                "id": "id",
                "isDefault": true,
                "name": "name",
                "slots": [
                  {
                    "day": "monday",
                    "time": "time"
                  },
                  {
                    "day": "monday",
                    "time": "time"
                  }
                ],
                "timeZone": "timeZone",
                "unavailableChannelIds": [
                  "unavailableChannelIds",
                  "unavailableChannelIds"
                ]
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/queues")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Queues.ListAsync(
            new ListQueuesRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            [
              {
                "channelIds": [
                  "channelIds"
                ],
                "channelSetId": "channelSetId",
                "createdAt": "createdAt",
                "id": "id",
                "isDefault": true,
                "name": "name",
                "slots": [
                  {
                    "day": "monday",
                    "time": "time"
                  }
                ],
                "timeZone": "timeZone",
                "unavailableChannelIds": [
                  "unavailableChannelIds"
                ]
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/queues")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Queues.ListAsync(
            new ListQueuesRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
