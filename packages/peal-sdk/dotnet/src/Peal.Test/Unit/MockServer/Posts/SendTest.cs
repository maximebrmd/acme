using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Posts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SendTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "channelIds": [
                "channelIds",
                "channelIds"
              ],
              "content": {
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
              "when": {
                "_tag": "now"
              }
            }
            """;

        const string mockResponse = """
            {
              "authorId": "authorId",
              "content": {
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
              "createdVia": {
                "id": "id",
                "name": "name",
                "via": "web"
              },
              "id": "id",
              "outcome": "published",
              "schedule": {
                "at": "at",
                "timeZone": "timeZone"
              },
              "scheduledBy": "scheduledBy",
              "scheduledVia": {
                "id": "id",
                "name": "name",
                "via": "web"
              },
              "status": "draft",
              "targets": [
                {
                  "channelId": "channelId",
                  "failureReason": "contentRejected",
                  "id": "id",
                  "keptPrivate": true,
                  "options": {
                    "platform": "youtube",
                    "categoryId": "categoryId",
                    "containsSyntheticMedia": true,
                    "madeForKids": true,
                    "notifySubscribers": true,
                    "privacy": "public",
                    "tags": [
                      "tags",
                      "tags"
                    ],
                    "title": "title"
                  },
                  "permalink": "permalink",
                  "publishedAt": "publishedAt",
                  "round": 1,
                  "status": "pending",
                  "unconfirmedReason": "noResponse"
                },
                {
                  "channelId": "channelId",
                  "failureReason": "contentRejected",
                  "id": "id",
                  "keptPrivate": true,
                  "options": {
                    "platform": "youtube",
                    "categoryId": "categoryId",
                    "containsSyntheticMedia": true,
                    "madeForKids": true,
                    "notifySubscribers": true,
                    "privacy": "public",
                    "tags": [
                      "tags",
                      "tags"
                    ],
                    "title": "title"
                  },
                  "permalink": "permalink",
                  "publishedAt": "publishedAt",
                  "round": 1,
                  "status": "pending",
                  "unconfirmedReason": "noResponse"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/send")
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

        var response = await Client.Posts.SendAsync(
            new NewPost
            {
                WorkspaceId = "workspaceId",
                ChannelIds = new List<string>() { "channelIds", "channelIds" },
                Content = new PostContent
                {
                    Media = new List<MediaAttachment>()
                    {
                        new MediaAttachment { AltText = "altText", MediaId = "mediaId" },
                        new MediaAttachment { AltText = "altText", MediaId = "mediaId" },
                    },
                    Overrides = new List<TextOverride>()
                    {
                        new TextOverride { ChannelId = "channelId", Text = "x" },
                        new TextOverride { ChannelId = "channelId", Text = "x" },
                    },
                    Text = "text",
                },
                Options = null,
                When = new PostTiming(new PostTiming.Now(new PostTimingNow { TimeZone = null })),
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "channelIds": [
                "channelIds"
              ],
              "content": {
                "media": [
                  {
                    "altText": "altText",
                    "mediaId": "mediaId"
                  }
                ],
                "overrides": [
                  {
                    "channelId": "channelId",
                    "text": "text"
                  }
                ],
                "text": "text"
              },
              "when": {
                "_tag": "now"
              }
            }
            """;

        const string mockResponse = """
            {
              "authorId": "authorId",
              "content": {
                "media": [
                  {
                    "altText": "altText",
                    "mediaId": "mediaId"
                  }
                ],
                "overrides": [
                  {
                    "channelId": "channelId",
                    "text": "text"
                  }
                ],
                "text": "text"
              },
              "createdVia": {
                "id": "id",
                "name": "name",
                "via": "web"
              },
              "id": "id",
              "outcome": "published",
              "schedule": {
                "at": "at",
                "timeZone": "timeZone"
              },
              "scheduledBy": "scheduledBy",
              "scheduledVia": {
                "id": "id",
                "name": "name",
                "via": "web"
              },
              "status": "draft",
              "targets": [
                {
                  "channelId": "channelId",
                  "failureReason": "contentRejected",
                  "id": "id",
                  "keptPrivate": true,
                  "options": {
                    "platform": "youtube"
                  },
                  "permalink": "permalink",
                  "publishedAt": "publishedAt",
                  "round": 1,
                  "status": "pending",
                  "unconfirmedReason": "noResponse"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/send")
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

        var response = await Client.Posts.SendAsync(
            new NewPost
            {
                WorkspaceId = "workspaceId",
                ChannelIds = new List<string>() { "channelIds" },
                Content = new PostContent
                {
                    Media = new List<MediaAttachment>()
                    {
                        new MediaAttachment { AltText = "altText", MediaId = "mediaId" },
                    },
                    Overrides = new List<TextOverride>()
                    {
                        new TextOverride { ChannelId = "channelId", Text = "text" },
                    },
                    Text = "text",
                },
                When = new PostTiming(new PostTiming.Now(new PostTimingNow())),
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
