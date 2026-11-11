using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Posts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class OutcomeTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "authorId": "authorId",
              "content": {
                "followUps": [
                  {
                    "delaySeconds": 86400,
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
                  {
                    "delaySeconds": 86400,
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
                ],
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
              "queueId": "queueId",
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
              "tagIds": [
                "tagIds",
                "tagIds"
              ],
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
                    "defaultLanguage": "defaultLanguage",
                    "embeddable": true,
                    "license": "youtube",
                    "madeForKids": true,
                    "notifySubscribers": true,
                    "privacy": "public",
                    "publicStatsViewable": true,
                    "recordingDate": "recordingDate",
                    "tags": [
                      "tags",
                      "tags"
                    ],
                    "thumbnailMediaId": "thumbnailMediaId",
                    "title": "title"
                  },
                  "parts": {
                    "count": 1,
                    "live": [
                      {
                        "index": 1,
                        "permalink": "permalink",
                        "platformPostId": "platformPostId",
                        "publishedAt": "publishedAt"
                      },
                      {
                        "index": 1,
                        "permalink": "permalink",
                        "platformPostId": "platformPostId",
                        "publishedAt": "publishedAt"
                      }
                    ]
                  },
                  "permalink": "permalink",
                  "publishedAt": "publishedAt",
                  "removedAt": "removedAt",
                  "round": 1,
                  "status": "pending",
                  "thumbnailNotSet": true,
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
                    "defaultLanguage": "defaultLanguage",
                    "embeddable": true,
                    "license": "youtube",
                    "madeForKids": true,
                    "notifySubscribers": true,
                    "privacy": "public",
                    "publicStatsViewable": true,
                    "recordingDate": "recordingDate",
                    "tags": [
                      "tags",
                      "tags"
                    ],
                    "thumbnailMediaId": "thumbnailMediaId",
                    "title": "title"
                  },
                  "parts": {
                    "count": 1,
                    "live": [
                      {
                        "index": 1,
                        "permalink": "permalink",
                        "platformPostId": "platformPostId",
                        "publishedAt": "publishedAt"
                      },
                      {
                        "index": 1,
                        "permalink": "permalink",
                        "platformPostId": "platformPostId",
                        "publishedAt": "publishedAt"
                      }
                    ]
                  },
                  "permalink": "permalink",
                  "publishedAt": "publishedAt",
                  "removedAt": "removedAt",
                  "round": 1,
                  "status": "pending",
                  "thumbnailNotSet": true,
                  "unconfirmedReason": "noResponse"
                }
              ],
              "warnings": [
                {
                  "_tag": "channelsDropped",
                  "channelIds": [
                    "channelIds",
                    "channelIds"
                  ],
                  "channelSetId": "channelSetId",
                  "channelSetName": "channelSetName"
                },
                {
                  "_tag": "channelsDropped",
                  "channelIds": [
                    "channelIds",
                    "channelIds"
                  ],
                  "channelSetId": "channelSetId",
                  "channelSetName": "channelSetName"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/outcome")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Posts.OutcomeAsync(
            new OutcomePostsRequest { WorkspaceId = "workspaceId", PostId = "postId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "authorId": "authorId",
              "content": {
                "followUps": [
                  {
                    "delaySeconds": 1,
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
                ],
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
              "queueId": "queueId",
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
              "tagIds": [
                "tagIds"
              ],
              "targets": [
                {
                  "channelId": "channelId",
                  "failureReason": "contentRejected",
                  "id": "id",
                  "keptPrivate": true,
                  "options": {
                    "platform": "youtube"
                  },
                  "parts": {
                    "count": 1,
                    "live": [
                      {
                        "index": 1,
                        "publishedAt": "publishedAt"
                      }
                    ]
                  },
                  "permalink": "permalink",
                  "publishedAt": "publishedAt",
                  "removedAt": "removedAt",
                  "round": 1,
                  "status": "pending",
                  "thumbnailNotSet": true,
                  "unconfirmedReason": "noResponse"
                }
              ],
              "warnings": [
                {
                  "_tag": "channelsDropped",
                  "channelIds": [
                    "channelIds"
                  ],
                  "channelSetId": "channelSetId",
                  "channelSetName": "channelSetName"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/outcome")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Posts.OutcomeAsync(
            new OutcomePostsRequest { WorkspaceId = "workspaceId", PostId = "postId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
