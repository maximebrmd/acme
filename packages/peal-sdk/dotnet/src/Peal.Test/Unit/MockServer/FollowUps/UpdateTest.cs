using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.FollowUps;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "approval": "notNeeded",
              "approvedAt": "approvedAt",
              "approvedBy": "approvedBy",
              "channels": [
                {
                  "channelId": "channelId",
                  "comment": "available",
                  "platform": "x",
                  "repost": "available"
                },
                {
                  "channelId": "channelId",
                  "comment": "available",
                  "platform": "x",
                  "repost": "available"
                }
              ],
              "channelId": "channelId",
              "comment": "comment",
              "createdAt": "createdAt",
              "endedReason": "stopped",
              "followUps": [
                {
                  "armedAt": "armedAt",
                  "channelId": "channelId",
                  "id": "id",
                  "kind": "comment",
                  "likes": 1,
                  "permalink": "permalink",
                  "platformPostId": "platformPostId",
                  "postId": "postId",
                  "reason": "reason",
                  "sentAt": "sentAt",
                  "status": "armed",
                  "targetId": "targetId",
                  "triggeredAt": "triggeredAt",
                  "until": "until"
                },
                {
                  "armedAt": "armedAt",
                  "channelId": "channelId",
                  "id": "id",
                  "kind": "comment",
                  "likes": 1,
                  "permalink": "permalink",
                  "platformPostId": "platformPostId",
                  "postId": "postId",
                  "reason": "reason",
                  "sentAt": "sentAt",
                  "status": "armed",
                  "targetId": "targetId",
                  "triggeredAt": "triggeredAt",
                  "until": "until"
                }
              ],
              "id": "id",
              "likes": 1,
              "postId": "postId",
              "repost": true,
              "startedBy": "startedBy",
              "startedVia": {
                "id": "id",
                "name": "name",
                "via": "web"
              },
              "status": "active"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/follow-ups/ruleId")
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

        var response = await Client.FollowUps.UpdateAsync(
            new FollowUpRuleChange
            {
                WorkspaceId = "workspaceId",
                RuleId = "ruleId",
                Comment = null,
                Likes = null,
                Paused = null,
                Repost = null,
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
              "approval": "notNeeded",
              "approvedAt": "approvedAt",
              "approvedBy": "approvedBy",
              "channels": [
                {
                  "channelId": "channelId",
                  "comment": "available",
                  "platform": "x",
                  "repost": "available"
                }
              ],
              "channelId": "channelId",
              "comment": "comment",
              "createdAt": "createdAt",
              "endedReason": "stopped",
              "followUps": [
                {
                  "armedAt": "armedAt",
                  "channelId": "channelId",
                  "id": "id",
                  "kind": "comment",
                  "likes": 1,
                  "permalink": "permalink",
                  "platformPostId": "platformPostId",
                  "postId": "postId",
                  "reason": "reason",
                  "sentAt": "sentAt",
                  "status": "armed",
                  "targetId": "targetId",
                  "triggeredAt": "triggeredAt",
                  "until": "until"
                }
              ],
              "id": "id",
              "likes": 1,
              "postId": "postId",
              "repost": true,
              "startedBy": "startedBy",
              "startedVia": {
                "id": "id",
                "name": "name",
                "via": "web"
              },
              "status": "active"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/follow-ups/ruleId")
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

        var response = await Client.FollowUps.UpdateAsync(
            new FollowUpRuleChange { WorkspaceId = "workspaceId", RuleId = "ruleId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
