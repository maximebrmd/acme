using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Review;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RevokeLinkTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "access": "view",
              "createdAt": "createdAt",
              "createdBy": "createdBy",
              "expiresAt": "expiresAt",
              "id": "id",
              "postId": "postId",
              "revokedAt": "revokedAt",
              "status": "active"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/review-links/linkId")
                    .UsingDelete()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Review.RevokeLinkAsync(
            new RevokeLinkReviewRequest { WorkspaceId = "workspaceId", LinkId = "linkId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "access": "view",
              "createdAt": "createdAt",
              "createdBy": "createdBy",
              "expiresAt": "expiresAt",
              "id": "id",
              "postId": "postId",
              "revokedAt": "revokedAt",
              "status": "active"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/review-links/linkId")
                    .UsingDelete()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Review.RevokeLinkAsync(
            new RevokeLinkReviewRequest { WorkspaceId = "workspaceId", LinkId = "linkId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
