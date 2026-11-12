using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Feeds;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "url": "url"
            }
            """;

        const string mockResponse = """
            {
              "feed": {
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
              },
              "seen": 1
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/feeds")
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

        var response = await Client.Feeds.CreateAsync(
            new NewFeed
            {
                WorkspaceId = "workspaceId",
                AttachPicture = null,
                ChannelIds = null,
                ChannelSetId = null,
                Mode = null,
                QueueId = null,
                Template = null,
                Url = "url",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "url": "url"
            }
            """;

        const string mockResponse = """
            {
              "feed": {
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
              },
              "seen": 1
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/feeds")
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

        var response = await Client.Feeds.CreateAsync(
            new NewFeed { WorkspaceId = "workspaceId", Url = "url" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
