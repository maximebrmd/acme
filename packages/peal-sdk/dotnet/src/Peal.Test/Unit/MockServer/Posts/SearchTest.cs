using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Posts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SearchTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "channels": [
                {
                  "channelId": "channelId",
                  "platform": "x"
                },
                {
                  "channelId": "channelId",
                  "platform": "x"
                }
              ],
              "items": [
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
                            "media": [],
                            "text": "x"
                          },
                          {
                            "channelId": "channelId",
                            "media": [],
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
                            "media": [],
                            "text": "x"
                          },
                          {
                            "channelId": "channelId",
                            "media": [],
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
                    "poll": {
                      "choices": [
                        "choices",
                        "choices"
                      ],
                      "durationMinutes": 43829,
                      "multipleChoice": true
                    },
                    "text": "text"
                  },
                  "createdVia": {
                    "id": "id",
                    "name": "name",
                    "via": "web"
                  },
                  "id": "id",
                  "occurrence": 1,
                  "outcome": "published",
                  "queueId": "queueId",
                  "recyclingId": "recyclingId",
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
                  "shortenLinks": true,
                  "status": "draft",
                  "tagIds": [
                    "tagIds",
                    "tagIds"
                  ],
                  "targets": [
                    {
                      "channelId": "channelId",
                      "dropped": true,
                      "editedAt": "editedAt",
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
                      "partsLeftOut": true,
                      "round": 1,
                      "status": "pending",
                      "thumbnailNotSet": true,
                      "unconfirmedReason": "noResponse"
                    },
                    {
                      "channelId": "channelId",
                      "dropped": true,
                      "editedAt": "editedAt",
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
                      "partsLeftOut": true,
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
                },
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
                            "media": [],
                            "text": "x"
                          },
                          {
                            "channelId": "channelId",
                            "media": [],
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
                            "media": [],
                            "text": "x"
                          },
                          {
                            "channelId": "channelId",
                            "media": [],
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
                    "poll": {
                      "choices": [
                        "choices",
                        "choices"
                      ],
                      "durationMinutes": 43829,
                      "multipleChoice": true
                    },
                    "text": "text"
                  },
                  "createdVia": {
                    "id": "id",
                    "name": "name",
                    "via": "web"
                  },
                  "id": "id",
                  "occurrence": 1,
                  "outcome": "published",
                  "queueId": "queueId",
                  "recyclingId": "recyclingId",
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
                  "shortenLinks": true,
                  "status": "draft",
                  "tagIds": [
                    "tagIds",
                    "tagIds"
                  ],
                  "targets": [
                    {
                      "channelId": "channelId",
                      "dropped": true,
                      "editedAt": "editedAt",
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
                      "partsLeftOut": true,
                      "round": 1,
                      "status": "pending",
                      "thumbnailNotSet": true,
                      "unconfirmedReason": "noResponse"
                    },
                    {
                      "channelId": "channelId",
                      "dropped": true,
                      "editedAt": "editedAt",
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
                      "partsLeftOut": true,
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
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/search")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Posts.SearchAsync(
            new SearchPostsRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "channels": [
                {
                  "channelId": "channelId",
                  "platform": "x"
                }
              ],
              "items": [
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
                    "via": "web"
                  },
                  "id": "id",
                  "occurrence": 1,
                  "outcome": "published",
                  "queueId": "queueId",
                  "recyclingId": "recyclingId",
                  "schedule": {
                    "at": "at",
                    "timeZone": "timeZone"
                  },
                  "scheduledBy": "scheduledBy",
                  "scheduledVia": {
                    "via": "web"
                  },
                  "shortenLinks": true,
                  "status": "draft",
                  "tagIds": [
                    "tagIds"
                  ],
                  "targets": [
                    {
                      "channelId": "channelId",
                      "id": "id",
                      "parts": {
                        "count": 1,
                        "live": [
                          {
                            "index": 1,
                            "publishedAt": "publishedAt"
                          }
                        ]
                      },
                      "round": 1,
                      "status": "pending"
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
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/search")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Posts.SearchAsync(
            new SearchPostsRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
