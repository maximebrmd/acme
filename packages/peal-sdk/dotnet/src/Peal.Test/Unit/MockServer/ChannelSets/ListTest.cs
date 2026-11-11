using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.ChannelSets;

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
              },
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
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channel-sets")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.ChannelSets.ListAsync(
            new ListChannelSetsRequest { WorkspaceId = "workspaceId" }
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
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channel-sets")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.ChannelSets.ListAsync(
            new ListChannelSetsRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
