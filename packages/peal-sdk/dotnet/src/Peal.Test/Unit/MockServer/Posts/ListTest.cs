using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Posts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            [
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
              },
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
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts")
                    .WithParam("from", "from")
                    .WithParam("to", "to")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Posts.ListAsync(
            new ListPostsRequest
            {
                WorkspaceId = "workspaceId",
                From = "from",
                To = "to",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            [
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
                    "id": "id",
                    "round": 1,
                    "status": "pending"
                  }
                ]
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts")
                    .WithParam("from", "from")
                    .WithParam("to", "to")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Posts.ListAsync(
            new ListPostsRequest
            {
                WorkspaceId = "workspaceId",
                From = "from",
                To = "to",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
