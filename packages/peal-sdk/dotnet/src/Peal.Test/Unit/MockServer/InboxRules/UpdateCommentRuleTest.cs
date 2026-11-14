using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.InboxRules;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateCommentRuleTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "channelId": "channelId",
              "channels": [
                {
                  "channelId": "channelId",
                  "platform": "x",
                  "reply": "available"
                },
                {
                  "channelId": "channelId",
                  "platform": "x",
                  "reply": "available"
                }
              ],
              "createdAt": "createdAt",
              "endedReason": "stopped",
              "id": "id",
              "keywords": [
                "keywords",
                "keywords"
              ],
              "matches": [
                {
                  "code": "code",
                  "commentId": "commentId",
                  "lookedAt": "lookedAt",
                  "outcome": "claimed",
                  "replyId": "replyId"
                },
                {
                  "code": "code",
                  "commentId": "commentId",
                  "lookedAt": "lookedAt",
                  "outcome": "claimed",
                  "replyId": "replyId"
                }
              ],
              "postId": "postId",
              "reply": "reply",
              "startedBy": "startedBy",
              "status": "active"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/rules/ruleId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxRules.UpdateCommentRuleAsync(
            new CommentRuleChange
            {
                WorkspaceId = "workspaceId",
                RuleId = "ruleId",
                Keywords = null,
                Paused = null,
                Reply = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "channelId": "channelId",
              "channels": [
                {
                  "channelId": "channelId",
                  "platform": "x",
                  "reply": "available"
                }
              ],
              "createdAt": "createdAt",
              "endedReason": "stopped",
              "id": "id",
              "keywords": [
                "keywords"
              ],
              "matches": [
                {
                  "code": "code",
                  "commentId": "commentId",
                  "lookedAt": "lookedAt",
                  "outcome": "claimed",
                  "replyId": "replyId"
                }
              ],
              "postId": "postId",
              "reply": "reply",
              "startedBy": "startedBy",
              "status": "active"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/inbox/rules/ruleId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.InboxRules.UpdateCommentRuleAsync(
            new CommentRuleChange { WorkspaceId = "workspaceId", RuleId = "ruleId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
