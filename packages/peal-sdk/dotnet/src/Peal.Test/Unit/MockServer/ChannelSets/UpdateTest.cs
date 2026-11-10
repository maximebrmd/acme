using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.ChannelSets;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTest : BaseMockServerTest
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
                    "madeForKids": true,
                    "notifySubscribers": true,
                    "privacy": "public",
                    "tags": [
                      "tags",
                      "tags"
                    ],
                    "title": "title"
                  }
                },
                {
                  "channelId": "channelId",
                  "options": {
                    "platform": "youtube",
                    "categoryId": "categoryId",
                    "containsSyntheticMedia": true,
                    "madeForKids": true,
                    "notifySubscribers": true,
                    "privacy": "public",
                    "tags": [
                      "tags",
                      "tags"
                    ],
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
                    .WithPath("/api/workspaces/workspaceId/channel-sets/channelSetId")
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

        var response = await Client.ChannelSets.UpdateAsync(
            new UpdateChannelSetsRequest
            {
                WorkspaceId = "workspaceId",
                ChannelSetId = "channelSetId",
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
                    .WithPath("/api/workspaces/workspaceId/channel-sets/channelSetId")
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

        var response = await Client.ChannelSets.UpdateAsync(
            new UpdateChannelSetsRequest
            {
                WorkspaceId = "workspaceId",
                ChannelSetId = "channelSetId",
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
