using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Review;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class PendingTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            [
              {
                "decision": {
                  "at": "at",
                  "by": {
                    "kind": "member",
                    "linkId": "linkId",
                    "name": "name",
                    "userId": "userId"
                  }
                },
                "id": "id",
                "postId": "postId",
                "requestedAt": "requestedAt",
                "requestedBy": "requestedBy",
                "requestedByName": "requestedByName",
                "requestedVia": "member",
                "schedule": {
                  "at": "at",
                  "timeZone": "timeZone"
                },
                "status": "pending"
              },
              {
                "decision": {
                  "at": "at",
                  "by": {
                    "kind": "member",
                    "linkId": "linkId",
                    "name": "name",
                    "userId": "userId"
                  }
                },
                "id": "id",
                "postId": "postId",
                "requestedAt": "requestedAt",
                "requestedBy": "requestedBy",
                "requestedByName": "requestedByName",
                "requestedVia": "member",
                "schedule": {
                  "at": "at",
                  "timeZone": "timeZone"
                },
                "status": "pending"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/approvals")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Review.PendingAsync(
            new PendingReviewRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            [
              {
                "decision": {
                  "at": "at",
                  "by": {
                    "kind": "member"
                  }
                },
                "id": "id",
                "postId": "postId",
                "requestedAt": "requestedAt",
                "requestedBy": "requestedBy",
                "requestedByName": "requestedByName",
                "requestedVia": "member",
                "schedule": {
                  "at": "at",
                  "timeZone": "timeZone"
                },
                "status": "pending"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/approvals")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Review.PendingAsync(
            new PendingReviewRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
