using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Posts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class BulkTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "posts": [
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
                },
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
              ]
            }
            """;

        const string mockResponse = """
            {
              "created": 1,
              "items": [
                {
                  "_tag": "created",
                  "index": 1,
                  "post": {
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
                          "madeForKids": true,
                          "notifySubscribers": true,
                          "privacy": "public",
                          "tags": [
                            "tags",
                            "tags"
                          ],
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
                        "round": 1,
                        "status": "pending",
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
                  "replayed": true
                },
                {
                  "_tag": "created",
                  "index": 1,
                  "post": {
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
                          "madeForKids": true,
                          "notifySubscribers": true,
                          "privacy": "public",
                          "tags": [
                            "tags",
                            "tags"
                          ],
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
                        "round": 1,
                        "status": "pending",
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
                  "replayed": true
                }
              ],
              "refused": 1
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/bulk")
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

        var response = await Client.Posts.BulkAsync(
            new BulkPosts
            {
                WorkspaceId = "workspaceId",
                Posts = new List<BulkPost>()
                {
                    new BulkPost
                    {
                        AllowDuplicate = null,
                        ChannelIds = new List<string>() { "channelIds", "channelIds" },
                        ChannelSets = null,
                        Content = new PostContent
                        {
                            FollowUps = null,
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
                        DefaultSignatures = null,
                        Options = null,
                        SignatureId = null,
                        TagIds = null,
                        When = new PostTiming(
                            new PostTiming.Now(new PostTimingNow { TimeZone = null })
                        ),
                        IdempotencyKey = null,
                    },
                    new BulkPost
                    {
                        AllowDuplicate = null,
                        ChannelIds = new List<string>() { "channelIds", "channelIds" },
                        ChannelSets = null,
                        Content = new PostContent
                        {
                            FollowUps = null,
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
                        DefaultSignatures = null,
                        Options = null,
                        SignatureId = null,
                        TagIds = null,
                        When = new PostTiming(
                            new PostTiming.Now(new PostTimingNow { TimeZone = null })
                        ),
                        IdempotencyKey = null,
                    },
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
              "posts": [
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
              ]
            }
            """;

        const string mockResponse = """
            {
              "created": 1,
              "items": [
                {
                  "_tag": "created",
                  "index": 1,
                  "post": {
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
                    ]
                  },
                  "replayed": true
                }
              ],
              "refused": 1
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/bulk")
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

        var response = await Client.Posts.BulkAsync(
            new BulkPosts
            {
                WorkspaceId = "workspaceId",
                Posts = new List<BulkPost>()
                {
                    new BulkPost
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
                        When = new PostTiming(new PostTiming.Now(new PostTimingNow())),
                    },
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
