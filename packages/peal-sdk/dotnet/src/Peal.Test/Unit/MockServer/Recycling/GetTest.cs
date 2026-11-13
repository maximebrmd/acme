using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Recycling;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
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
                      "media": [
                        {
                          "altText": "altText",
                          "mediaId": "mediaId"
                        },
                        {
                          "altText": "altText",
                          "mediaId": "mediaId"
                        }
                      ],
                      "text": "x"
                    },
                    {
                      "channelId": "channelId",
                      "media": [
                        {
                          "altText": "altText",
                          "mediaId": "mediaId"
                        },
                        {
                          "altText": "altText",
                          "mediaId": "mediaId"
                        }
                      ],
                      "text": "x"
                    }
                  ],
                  "text": "text"
                },
                {
                  "overrides": [
                    {
                      "channelId": "channelId",
                      "media": [
                        {
                          "altText": "altText",
                          "mediaId": "mediaId"
                        },
                        {
                          "altText": "altText",
                          "mediaId": "mediaId"
                        }
                      ],
                      "text": "x"
                    },
                    {
                      "channelId": "channelId",
                      "media": [
                        {
                          "altText": "altText",
                          "mediaId": "mediaId"
                        },
                        {
                          "altText": "altText",
                          "mediaId": "mediaId"
                        }
                      ],
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
                    .WithPath("/api/workspaces/workspaceId/recycling/ruleId")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Recycling.GetAsync(
            new GetRecyclingRequest { WorkspaceId = "workspaceId", RuleId = "ruleId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
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
                    .WithPath("/api/workspaces/workspaceId/recycling/ruleId")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Recycling.GetAsync(
            new GetRecyclingRequest { WorkspaceId = "workspaceId", RuleId = "ruleId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
