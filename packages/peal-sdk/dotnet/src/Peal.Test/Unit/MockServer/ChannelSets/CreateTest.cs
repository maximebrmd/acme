using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.ChannelSets;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "channelIds": [
                "channelIds",
                "channelIds"
              ],
              "name": "x"
            }
            """;

        const string mockResponse = """
            {
              "channelIds": [
                "channelIds",
                "channelIds"
              ],
              "createdAt": "createdAt",
              "id": "id",
              "name": "name",
              "options": [
                {
                  "channelId": "channelId",
                  "options": {
                    "platform": "youtube",
                    "categoryId": "categoryId",
                    "containsSyntheticMedia": true,
                    "defaultLanguage": "defaultLanguage",
                    "embeddable": true,
                    "license": "youtube",
                    "madeForKids": true,
                    "notifySubscribers": true,
                    "privacy": "public",
                    "publicStatsViewable": true,
                    "recordingDate": "recordingDate",
                    "tags": [
                      "tags",
                      "tags"
                    ],
                    "thumbnailMediaId": "thumbnailMediaId",
                    "title": "title"
                  }
                },
                {
                  "channelId": "channelId",
                  "options": {
                    "platform": "youtube",
                    "categoryId": "categoryId",
                    "containsSyntheticMedia": true,
                    "defaultLanguage": "defaultLanguage",
                    "embeddable": true,
                    "license": "youtube",
                    "madeForKids": true,
                    "notifySubscribers": true,
                    "privacy": "public",
                    "publicStatsViewable": true,
                    "recordingDate": "recordingDate",
                    "tags": [
                      "tags",
                      "tags"
                    ],
                    "thumbnailMediaId": "thumbnailMediaId",
                    "title": "title"
                  }
                }
              ],
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
                    .WithPath("/api/workspaces/workspaceId/channel-sets")
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

        var response = await Client.ChannelSets.CreateAsync(
            new CreateChannelSetsRequest
            {
                WorkspaceId = "workspaceId",
                Body = new ChannelSetDetails
                {
                    ChannelIds = new List<string>() { "channelIds", "channelIds" },
                    Name = "x",
                    Options = null,
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
              "channelIds": [
                "channelIds"
              ],
              "name": "name"
            }
            """;

        const string mockResponse = """
            {
              "channelIds": [
                "channelIds"
              ],
              "createdAt": "createdAt",
              "id": "id",
              "name": "name",
              "options": [
                {
                  "channelId": "channelId",
                  "options": {
                    "platform": "youtube"
                  }
                }
              ],
              "unavailableChannelIds": [
                "unavailableChannelIds"
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channel-sets")
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

        var response = await Client.ChannelSets.CreateAsync(
            new CreateChannelSetsRequest
            {
                WorkspaceId = "workspaceId",
                Body = new ChannelSetDetails
                {
                    ChannelIds = new List<string>() { "channelIds" },
                    Name = "name",
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
