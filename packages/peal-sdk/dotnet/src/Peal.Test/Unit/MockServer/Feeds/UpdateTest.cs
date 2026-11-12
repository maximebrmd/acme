using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Feeds;

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
              "attachPicture": true,
              "channelIds": [
                "channelIds",
                "channelIds"
              ],
              "channelSetId": "channelSetId",
              "createdAt": "createdAt",
              "failingSince": "failingSince",
              "id": "id",
              "lastCheckedAt": "lastCheckedAt",
              "lastFailure": "timeout",
              "mode": "draft",
              "nextCheckAt": "nextCheckAt",
              "queueId": "queueId",
              "since": "since",
              "startedBy": "startedBy",
              "startedVia": {
                "id": "id",
                "name": "name",
                "via": "web"
              },
              "status": "active",
              "statusAt": "statusAt",
              "stopReason": "unreachable",
              "template": "template",
              "title": "title",
              "updatedAt": "updatedAt",
              "url": "url"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/feeds/feedId")
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

        var response = await Client.Feeds.UpdateAsync(
            new FeedChange
            {
                WorkspaceId = "workspaceId",
                FeedId = "feedId",
                AttachPicture = null,
                ChannelIds = null,
                ChannelSetId = null,
                Mode = null,
                QueueId = null,
                Status = null,
                Template = null,
                Url = null,
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
              "attachPicture": true,
              "channelIds": [
                "channelIds"
              ],
              "channelSetId": "channelSetId",
              "createdAt": "createdAt",
              "failingSince": "failingSince",
              "id": "id",
              "lastCheckedAt": "lastCheckedAt",
              "lastFailure": "timeout",
              "mode": "draft",
              "nextCheckAt": "nextCheckAt",
              "queueId": "queueId",
              "since": "since",
              "startedBy": "startedBy",
              "startedVia": {
                "id": "id",
                "name": "name",
                "via": "web"
              },
              "status": "active",
              "statusAt": "statusAt",
              "stopReason": "unreachable",
              "template": "template",
              "title": "title",
              "updatedAt": "updatedAt",
              "url": "url"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/feeds/feedId")
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

        var response = await Client.Feeds.UpdateAsync(
            new FeedChange { WorkspaceId = "workspaceId", FeedId = "feedId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
