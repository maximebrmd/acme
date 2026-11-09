using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Posts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateTest : BaseMockServerTest
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
              "id": "id",
              "outcome": "published",
              "schedule": {
                "at": "at",
                "timeZone": "timeZone"
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
                    .WithPath("/api/workspaces/workspaceId/posts/postId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPut()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Posts.UpdateAsync(
            new UpdatePostsRequest
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                Body = new PostDraft
                {
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
                },
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
              "id": "id",
              "outcome": "published",
              "schedule": {
                "at": "at",
                "timeZone": "timeZone"
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
                    .WithPath("/api/workspaces/workspaceId/posts/postId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPut()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Posts.UpdateAsync(
            new UpdatePostsRequest
            {
                WorkspaceId = "workspaceId",
                PostId = "postId",
                Body = new PostDraft
                {
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
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
