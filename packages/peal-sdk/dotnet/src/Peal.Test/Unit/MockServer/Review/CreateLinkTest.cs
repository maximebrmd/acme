using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Review;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateLinkTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "access": "view"
            }
            """;

        const string mockResponse = """
            {
              "link": {
                "access": "view",
                "createdAt": "createdAt",
                "createdBy": "createdBy",
                "expiresAt": "expiresAt",
                "id": "id",
                "postId": "postId",
                "revokedAt": "revokedAt",
                "status": "active"
              },
              "token": "token",
              "url": "url"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/review-links")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPost()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Review.CreateLinkAsync(
            new NewReviewLink
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                Access = ReviewLinkAccess.View,
                ExpiresInHours = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "access": "view"
            }
            """;

        const string mockResponse = """
            {
              "link": {
                "access": "view",
                "createdAt": "createdAt",
                "createdBy": "createdBy",
                "expiresAt": "expiresAt",
                "id": "id",
                "postId": "postId",
                "revokedAt": "revokedAt",
                "status": "active"
              },
              "token": "token",
              "url": "url"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/review-links")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPost()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Review.CreateLinkAsync(
            new NewReviewLink
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                Access = ReviewLinkAccess.View,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
