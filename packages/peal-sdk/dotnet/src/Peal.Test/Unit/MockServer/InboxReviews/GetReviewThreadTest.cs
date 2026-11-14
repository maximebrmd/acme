using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.InboxReviews;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetReviewThreadTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "abilities": {
                "read": "available",
                "reply": "available",
                "withdraw": "available"
              },
              "platform": "x",
              "replies": [
                {
                  "authorId": "authorId",
                  "createdAt": "createdAt",
                  "id": "id",
                  "reason": "channelUnavailable",
                  "reviewId": "reviewId",
                  "settledAt": "settledAt",
                  "status": "sending",
                  "text": "text",
                  "threadId": "threadId"
                },
                {
                  "authorId": "authorId",
                  "createdAt": "createdAt",
                  "id": "id",
                  "reason": "channelUnavailable",
                  "reviewId": "reviewId",
                  "settledAt": "settledAt",
                  "status": "sending",
                  "text": "text",
                  "threadId": "threadId"
                }
              ],
              "reviews": [
                {
                  "id": "id",
                  "markedAnswered": true,
                  "photos": 1,
                  "rating": 1,
                  "receivedAt": "receivedAt",
                  "reply": {
                    "moderation": "pending",
                    "text": "text",
                    "updatedAt": "updatedAt"
                  },
                  "reviewerName": "reviewerName",
                  "state": "new",
                  "text": "text",
                  "threadId": "threadId",
                  "updatedAt": "updatedAt",
                  "writtenAt": "writtenAt"
                },
                {
                  "id": "id",
                  "markedAnswered": true,
                  "photos": 1,
                  "rating": 1,
                  "receivedAt": "receivedAt",
                  "reply": {
                    "moderation": "pending",
                    "text": "text",
                    "updatedAt": "updatedAt"
                  },
                  "reviewerName": "reviewerName",
                  "state": "new",
                  "text": "text",
                  "threadId": "threadId",
                  "updatedAt": "updatedAt",
                  "writtenAt": "writtenAt"
                }
              ],
              "thread": {
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
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/reviews/threads/threadId")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxReviews.GetReviewThreadAsync(
            new GetReviewThreadInboxReviewsRequest
            {
                WorkspaceId = "workspaceId",
                ThreadId = "threadId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "abilities": {
                "read": "available",
                "reply": "available",
                "withdraw": "available"
              },
              "platform": "x",
              "replies": [
                {
                  "authorId": "authorId",
                  "createdAt": "createdAt",
                  "id": "id",
                  "reason": "channelUnavailable",
                  "reviewId": "reviewId",
                  "settledAt": "settledAt",
                  "status": "sending",
                  "text": "text",
                  "threadId": "threadId"
                }
              ],
              "reviews": [
                {
                  "id": "id",
                  "markedAnswered": true,
                  "photos": 1,
                  "rating": 1,
                  "receivedAt": "receivedAt",
                  "reply": {
                    "text": "text",
                    "updatedAt": "updatedAt"
                  },
                  "reviewerName": "reviewerName",
                  "state": "new",
                  "text": "text",
                  "threadId": "threadId",
                  "updatedAt": "updatedAt",
                  "writtenAt": "writtenAt"
                }
              ],
              "thread": {
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
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/reviews/threads/threadId")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxReviews.GetReviewThreadAsync(
            new GetReviewThreadInboxReviewsRequest
            {
                WorkspaceId = "workspaceId",
                ThreadId = "threadId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
