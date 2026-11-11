using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.ChannelDefaults;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
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
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.ChannelDefaults.GetAsync(
            new GetChannelDefaultsRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
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
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.ChannelDefaults.GetAsync(
            new GetChannelDefaultsRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
