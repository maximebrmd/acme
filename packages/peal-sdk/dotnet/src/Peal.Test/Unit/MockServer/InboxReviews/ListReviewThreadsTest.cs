using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.InboxReviews;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListReviewThreadsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "items": [
                {
                  "averageRating": "Infinity",
                  "channelId": "channelId",
                  "id": "id",
                  "kind": "reviews",
                  "lastCollectedAt": "lastCollectedAt",
                  "lastReviewAt": "lastReviewAt",
                  "reviews": 1,
                  "totalReviewCount": 1,
                  "unanswered": 1
                },
                {
                  "averageRating": "Infinity",
                  "channelId": "channelId",
                  "id": "id",
                  "kind": "reviews",
                  "lastCollectedAt": "lastCollectedAt",
                  "lastReviewAt": "lastReviewAt",
                  "reviews": 1,
                  "totalReviewCount": 1,
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
                    .WithPath("/api/workspaces/workspaceId/inbox/reviews/threads")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxReviews.ListReviewThreadsAsync(
            new ListReviewThreadsInboxReviewsRequest { WorkspaceId = "workspaceId" }
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
                  "averageRating": "Infinity",
                  "channelId": "channelId",
                  "id": "id",
                  "kind": "reviews",
                  "lastCollectedAt": "lastCollectedAt",
                  "lastReviewAt": "lastReviewAt",
                  "reviews": 1,
                  "totalReviewCount": 1,
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
                    .WithPath("/api/workspaces/workspaceId/inbox/reviews/threads")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxReviews.ListReviewThreadsAsync(
            new ListReviewThreadsInboxReviewsRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
