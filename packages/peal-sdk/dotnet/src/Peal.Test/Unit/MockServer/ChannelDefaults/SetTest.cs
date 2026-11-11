using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.ChannelDefaults;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "options": {
                "platform": "youtube"
              }
            }
            """;

        const string mockResponse = """
            {
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId/default-options")
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

        var response = await Client.ChannelDefaults.SetAsync(
            new NewChannelDefaults
            {
                WorkspaceId = "workspaceId",
                ChannelId = "channelId",
                Options = new TargetOptions(
                    new TargetOptions.Youtube(
                        new YouTubeOptions
                        {
                            CategoryId = null,
                            ContainsSyntheticMedia = null,
                            DefaultLanguage = null,
                            Embeddable = null,
                            License = null,
                            MadeForKids = null,
                            NotifySubscribers = null,
                            Privacy = null,
                            PublicStatsViewable = null,
                            RecordingDate = null,
                            Tags = null,
                            ThumbnailMediaId = null,
                            Title = null,
                        }
                    )
                ),
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "options": {
                "platform": "youtube"
              }
            }
            """;

        const string mockResponse = """
            {
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
                  "tags"
                ],
                "thumbnailMediaId": "thumbnailMediaId",
                "title": "title"
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId/default-options")
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

        var response = await Client.ChannelDefaults.SetAsync(
            new NewChannelDefaults
            {
                WorkspaceId = "workspaceId",
                ChannelId = "channelId",
                Options = new TargetOptions(new TargetOptions.Youtube(new YouTubeOptions())),
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
