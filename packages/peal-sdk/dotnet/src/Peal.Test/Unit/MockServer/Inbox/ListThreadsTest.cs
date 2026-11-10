using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Inbox;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListThreadsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "items": [
                {
                  "channelId": "channelId",
                  "collectionEnded": "window",
                  "comments": 1,
                  "id": "id",
                  "lastCollectedAt": "lastCollectedAt",
                  "lastCommentAt": "lastCommentAt",
                  "permalink": "permalink",
                  "postId": "postId",
                  "publishedAt": "publishedAt",
                  "targetId": "targetId",
                  "unanswered": 1
                },
                {
                  "channelId": "channelId",
                  "collectionEnded": "window",
                  "comments": 1,
                  "id": "id",
                  "lastCollectedAt": "lastCollectedAt",
                  "lastCommentAt": "lastCommentAt",
                  "permalink": "permalink",
                  "postId": "postId",
                  "publishedAt": "publishedAt",
                  "targetId": "targetId",
                  "unanswered": 1
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/threads")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Inbox.ListThreadsAsync(
            new ListThreadsInboxRequest { WorkspaceId = "workspaceId" }
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
                  "channelId": "channelId",
                  "collectionEnded": "window",
                  "comments": 1,
                  "id": "id",
                  "lastCollectedAt": "lastCollectedAt",
                  "lastCommentAt": "lastCommentAt",
                  "permalink": "permalink",
                  "postId": "postId",
                  "publishedAt": "publishedAt",
                  "targetId": "targetId",
                  "unanswered": 1
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/threads")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Inbox.ListThreadsAsync(
            new ListThreadsInboxRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
