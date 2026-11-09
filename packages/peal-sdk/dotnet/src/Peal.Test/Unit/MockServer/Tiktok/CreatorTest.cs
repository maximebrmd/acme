using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Tiktok;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreatorTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "posting": {
                "_tag": "ready",
                "creator": {
                  "avatarUrl": "avatarUrl",
                  "commentDisabled": true,
                  "duetDisabled": true,
                  "maxVideoDurationMs": 1,
                  "nickname": "nickname",
                  "privacyLevels": [
                    "PUBLIC_TO_EVERYONE",
                    "PUBLIC_TO_EVERYONE"
                  ],
                  "stitchDisabled": true,
                  "username": "username"
                }
              },
              "takesPhotos": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId/tiktok-creator")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Tiktok.CreatorAsync(
            new CreatorTiktokRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "posting": {
                "_tag": "ready",
                "creator": {
                  "avatarUrl": "avatarUrl",
                  "commentDisabled": true,
                  "duetDisabled": true,
                  "maxVideoDurationMs": 1,
                  "nickname": "nickname",
                  "privacyLevels": [
                    "PUBLIC_TO_EVERYONE"
                  ],
                  "stitchDisabled": true,
                  "username": "username"
                }
              },
              "takesPhotos": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId/tiktok-creator")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Tiktok.CreatorAsync(
            new CreatorTiktokRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
