using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Recycling;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "every": {
                "count": 1,
                "unit": "days"
              },
              "postId": "postId"
            }
            """;

        const string mockResponse = """
            {
              "anchorAt": "anchorAt",
              "coming": [
                {
                  "at": "at",
                  "occurrence": 1,
                  "variant": 1
                },
                {
                  "at": "at",
                  "occurrence": 1,
                  "variant": 1
                }
              ],
              "count": 1,
              "createdAt": "createdAt",
              "endedReason": "completed",
              "every": {
                "count": 1,
                "unit": "days"
              },
              "id": "id",
              "lastDueAt": "lastDueAt",
              "made": 1,
              "nextDueAt": "nextDueAt",
              "queueId": "queueId",
              "sourcePostId": "sourcePostId",
              "startedBy": "startedBy",
              "startedVia": {
                "id": "id",
                "name": "name",
                "via": "web"
              },
              "status": "active",
              "timeZone": "timeZone",
              "until": "until",
              "variants": [
                {
                  "overrides": [
                    {
                      "channelId": "channelId",
                      "text": "x"
                    },
                    {
                      "channelId": "channelId",
                      "text": "x"
                    }
                  ],
                  "text": "text"
                },
                {
                  "overrides": [
                    {
                      "channelId": "channelId",
                      "text": "x"
                    },
                    {
                      "channelId": "channelId",
                      "text": "x"
                    }
                  ],
                  "text": "text"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/recycling")
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

        var response = await Client.Recycling.CreateAsync(
            new NewRecyclingRule
            {
                WorkspaceId = "workspaceId",
                Count = null,
                Every = new RecyclingInterval { Count = 1, Unit = RecyclingUnit.Days },
                PostId = "postId",
                QueueId = null,
                Until = null,
                Variants = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "every": {
                "count": 1,
                "unit": "days"
              },
              "postId": "postId"
            }
            """;

        const string mockResponse = """
            {
              "anchorAt": "anchorAt",
              "coming": [
                {
                  "at": "at",
                  "occurrence": 1,
                  "variant": 1
                }
              ],
              "count": 1,
              "createdAt": "createdAt",
              "endedReason": "completed",
              "every": {
                "count": 1,
                "unit": "days"
              },
              "id": "id",
              "lastDueAt": "lastDueAt",
              "made": 1,
              "nextDueAt": "nextDueAt",
              "queueId": "queueId",
              "sourcePostId": "sourcePostId",
              "startedBy": "startedBy",
              "startedVia": {
                "id": "id",
                "name": "name",
                "via": "web"
              },
              "status": "active",
              "timeZone": "timeZone",
              "until": "until",
              "variants": [
                {
                  "overrides": [
                    {
                      "channelId": "channelId",
                      "text": "text"
                    }
                  ],
                  "text": "text"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/recycling")
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

        var response = await Client.Recycling.CreateAsync(
            new NewRecyclingRule
            {
                WorkspaceId = "workspaceId",
                Every = new RecyclingInterval { Count = 1, Unit = RecyclingUnit.Days },
                PostId = "postId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
