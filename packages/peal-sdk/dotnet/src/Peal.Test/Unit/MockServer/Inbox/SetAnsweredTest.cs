using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Inbox;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SetAnsweredTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "answered": true
            }
            """;

        const string mockResponse = """
            {
              "author": {
                "displayName": "displayName",
                "handle": "handle",
                "platformId": "platformId"
              },
              "id": "id",
              "liked": true,
              "parentId": "parentId",
              "permalink": "permalink",
              "receivedAt": "receivedAt",
              "state": "new",
              "text": "text",
              "threadId": "threadId",
              "writtenAt": "writtenAt"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/comments/commentId/answered")
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

        var response = await Client.Inbox.SetAnsweredAsync(
            new SetAnsweredInboxRequest
            {
                WorkspaceId = "workspaceId",
                CommentId = "commentId",
                Answered = true,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "answered": true
            }
            """;

        const string mockResponse = """
            {
              "author": {
                "displayName": "displayName",
                "handle": "handle",
                "platformId": "platformId"
              },
              "id": "id",
              "liked": true,
              "parentId": "parentId",
              "permalink": "permalink",
              "receivedAt": "receivedAt",
              "state": "new",
              "text": "text",
              "threadId": "threadId",
              "writtenAt": "writtenAt"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/comments/commentId/answered")
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

        var response = await Client.Inbox.SetAnsweredAsync(
            new SetAnsweredInboxRequest
            {
                WorkspaceId = "workspaceId",
                CommentId = "commentId",
                Answered = true,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
