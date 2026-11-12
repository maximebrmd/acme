using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Feeds;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ItemsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "items": [
                {
                  "itemAt": "itemAt",
                  "outcome": "made",
                  "pictureSkipped": "notPublic",
                  "postId": "postId",
                  "reason": "existing",
                  "seenAt": "seenAt"
                },
                {
                  "itemAt": "itemAt",
                  "outcome": "made",
                  "pictureSkipped": "notPublic",
                  "postId": "postId",
                  "reason": "existing",
                  "seenAt": "seenAt"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/feeds/feedId/items")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Feeds.ItemsAsync(
            new ItemsFeedsRequest { WorkspaceId = "workspaceId", FeedId = "feedId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "items": [
                {
                  "itemAt": "itemAt",
                  "outcome": "made",
                  "pictureSkipped": "notPublic",
                  "postId": "postId",
                  "reason": "existing",
                  "seenAt": "seenAt"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/feeds/feedId/items")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Feeds.ItemsAsync(
            new ItemsFeedsRequest { WorkspaceId = "workspaceId", FeedId = "feedId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
