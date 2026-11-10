using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Review;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ApproveTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "approvalId": "approvalId",
              "subjectHash": "subjectHash"
            }
            """;

        const string mockResponse = """
            {
              "approval": {
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
                "status": "pending",
                "subjectHash": "subjectHash"
              },
              "late": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/approve")
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

        var response = await Client.Review.ApproveAsync(
            new ApprovalDecision
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                ApprovalId = "approvalId",
                SubjectHash = "subjectHash",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "approvalId": "approvalId",
              "subjectHash": "subjectHash"
            }
            """;

        const string mockResponse = """
            {
              "approval": {
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
                "status": "pending",
                "subjectHash": "subjectHash"
              },
              "late": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/approve")
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

        var response = await Client.Review.ApproveAsync(
            new ApprovalDecision
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                ApprovalId = "approvalId",
                SubjectHash = "subjectHash",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
