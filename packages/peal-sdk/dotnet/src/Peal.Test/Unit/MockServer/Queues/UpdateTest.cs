using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Queues;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "name": "x",
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
              "timeZone": "timeZone"
            }
            """;

        const string mockResponse = """
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/queues/queueId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPut()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Queues.UpdateAsync(
            new UpdateQueuesRequest
            {
                WorkspaceId = "workspaceId",
                QueueId = "queueId",
                Body = new QueueDetails
                {
                    ChannelIds = null,
                    ChannelSetId = null,
                    IsDefault = null,
                    Name = "x",
                    Slots = new List<QueueSlot>()
                    {
                        new QueueSlot { Day = Weekday.Monday, Time = "time" },
                        new QueueSlot { Day = Weekday.Monday, Time = "time" },
                    },
                    TimeZone = "timeZone",
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
              "name": "name",
              "slots": [
                {
                  "day": "monday",
                  "time": "time"
                }
              ],
              "timeZone": "timeZone"
            }
            """;

        const string mockResponse = """
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/queues/queueId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPut()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Queues.UpdateAsync(
            new UpdateQueuesRequest
            {
                WorkspaceId = "workspaceId",
                QueueId = "queueId",
                Body = new QueueDetails
                {
                    Name = "name",
                    Slots = new List<QueueSlot>()
                    {
                        new QueueSlot { Day = Weekday.Monday, Time = "time" },
                    },
                    TimeZone = "timeZone",
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
