using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Review;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ThreadTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "approvals": [
                {
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
                {
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
                }
              ],
              "channels": [
                {
                  "channelId": "channelId",
                  "followUps": [
                    {
                      "delaySeconds": 1,
                      "media": [
                        {
                          "altText": "altText",
                          "kind": "image",
                          "mediaId": "mediaId",
                          "url": "url"
                        },
                        {
                          "altText": "altText",
                          "kind": "image",
                          "mediaId": "mediaId",
                          "url": "url"
                        }
                      ],
                      "text": "text"
                    },
                    {
                      "delaySeconds": 1,
                      "media": [
                        {
                          "altText": "altText",
                          "kind": "image",
                          "mediaId": "mediaId",
                          "url": "url"
                        },
                        {
                          "altText": "altText",
                          "kind": "image",
                          "mediaId": "mediaId",
                          "url": "url"
                        }
                      ],
                      "text": "text"
                    }
                  ],
                  "handle": "handle",
                  "media": [
                    {
                      "altText": "altText",
                      "kind": "image",
                      "mediaId": "mediaId",
                      "url": "url"
                    },
                    {
                      "altText": "altText",
                      "kind": "image",
                      "mediaId": "mediaId",
                      "url": "url"
                    }
                  ],
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
                  "platform": "x",
                  "text": "text"
                },
                {
                  "channelId": "channelId",
                  "followUps": [
                    {
                      "delaySeconds": 1,
                      "media": [
                        {
                          "altText": "altText",
                          "kind": "image",
                          "mediaId": "mediaId",
                          "url": "url"
                        },
                        {
                          "altText": "altText",
                          "kind": "image",
                          "mediaId": "mediaId",
                          "url": "url"
                        }
                      ],
                      "text": "text"
                    },
                    {
                      "delaySeconds": 1,
                      "media": [
                        {
                          "altText": "altText",
                          "kind": "image",
                          "mediaId": "mediaId",
                          "url": "url"
                        },
                        {
                          "altText": "altText",
                          "kind": "image",
                          "mediaId": "mediaId",
                          "url": "url"
                        }
                      ],
                      "text": "text"
                    }
                  ],
                  "handle": "handle",
                  "media": [
                    {
                      "altText": "altText",
                      "kind": "image",
                      "mediaId": "mediaId",
                      "url": "url"
                    },
                    {
                      "altText": "altText",
                      "kind": "image",
                      "mediaId": "mediaId",
                      "url": "url"
                    }
                  ],
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
                  "platform": "x",
                  "text": "text"
                }
              ],
              "comments": [
                {
                  "anchor": {
                    "channelId": "channelId",
                    "selection": {
                      "located": {
                        "end": 1,
                        "start": 1
                      },
                      "quote": "quote",
                      "start": 1
                    }
                  },
                  "author": {
                    "kind": "member",
                    "linkId": "linkId",
                    "name": "name",
                    "userId": "userId"
                  },
                  "createdAt": "createdAt",
                  "id": "id",
                  "parentId": "parentId",
                  "postId": "postId",
                  "resolved": {
                    "at": "at",
                    "by": {
                      "kind": "member",
                      "linkId": "linkId",
                      "name": "name",
                      "userId": "userId"
                    }
                  },
                  "text": "text"
                },
                {
                  "anchor": {
                    "channelId": "channelId",
                    "selection": {
                      "located": {
                        "end": 1,
                        "start": 1
                      },
                      "quote": "quote",
                      "start": 1
                    }
                  },
                  "author": {
                    "kind": "member",
                    "linkId": "linkId",
                    "name": "name",
                    "userId": "userId"
                  },
                  "createdAt": "createdAt",
                  "id": "id",
                  "parentId": "parentId",
                  "postId": "postId",
                  "resolved": {
                    "at": "at",
                    "by": {
                      "kind": "member",
                      "linkId": "linkId",
                      "name": "name",
                      "userId": "userId"
                    }
                  },
                  "text": "text"
                }
              ],
              "media": [
                {
                  "altText": "altText",
                  "kind": "image",
                  "mediaId": "mediaId",
                  "url": "url"
                },
                {
                  "altText": "altText",
                  "kind": "image",
                  "mediaId": "mediaId",
                  "url": "url"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/review")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Review.ThreadAsync(
            new ThreadReviewRequest { WorkspaceId = "workspaceId", PostId = "postId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "approvals": [
                {
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
                }
              ],
              "channels": [
                {
                  "channelId": "channelId",
                  "followUps": [
                    {
                      "delaySeconds": 1,
                      "media": [
                        {
                          "altText": "altText",
                          "mediaId": "mediaId"
                        }
                      ],
                      "text": "text"
                    }
                  ],
                  "handle": "handle",
                  "media": [
                    {
                      "altText": "altText",
                      "mediaId": "mediaId"
                    }
                  ],
                  "options": {
                    "platform": "youtube"
                  },
                  "platform": "x",
                  "text": "text"
                }
              ],
              "comments": [
                {
                  "anchor": {
                    "channelId": "channelId"
                  },
                  "author": {
                    "kind": "member"
                  },
                  "createdAt": "createdAt",
                  "id": "id",
                  "parentId": "parentId",
                  "postId": "postId",
                  "resolved": {
                    "at": "at",
                    "by": {
                      "kind": "member"
                    }
                  },
                  "text": "text"
                }
              ],
              "media": [
                {
                  "altText": "altText",
                  "kind": "image",
                  "mediaId": "mediaId",
                  "url": "url"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/postId/review")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Review.ThreadAsync(
            new ThreadReviewRequest { WorkspaceId = "workspaceId", PostId = "postId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
