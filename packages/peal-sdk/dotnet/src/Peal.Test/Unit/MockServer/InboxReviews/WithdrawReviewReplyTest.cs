using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.InboxReviews;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class WithdrawReviewReplyTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/reviews/reviewId/reply")
                    .UsingDelete()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxReviews.WithdrawReviewReplyAsync(
            new WithdrawReviewReplyInboxReviewsRequest
            {
                WorkspaceId = "workspaceId",
                ReviewId = "reviewId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/reviews/reviewId/reply")
                    .UsingDelete()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxReviews.WithdrawReviewReplyAsync(
            new WithdrawReviewReplyInboxReviewsRequest
            {
                WorkspaceId = "workspaceId",
                ReviewId = "reviewId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
