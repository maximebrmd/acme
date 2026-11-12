using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Feeds;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
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
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Feeds.GetAsync(
            new GetFeedsRequest { WorkspaceId = "workspaceId", FeedId = "feedId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
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
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Feeds.GetAsync(
            new GetFeedsRequest { WorkspaceId = "workspaceId", FeedId = "feedId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
