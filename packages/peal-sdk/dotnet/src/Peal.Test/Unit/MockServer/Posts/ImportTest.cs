using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Posts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ImportTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "csv": "csv"
            }
            """;

        const string mockResponse = """
            {
              "created": 1,
              "dryRun": true,
              "rows": [
                {
                  "_tag": "created",
                  "post": {
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
                  },
                  "replayed": true,
                  "row": 1
                },
                {
                  "_tag": "created",
                  "post": {
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
                  },
                  "replayed": true,
                  "row": 1
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/import")
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

        var response = await Client.Posts.ImportAsync(
            new PostImport
            {
                WorkspaceId = "workspaceId",
                Csv = "csv",
                DryRun = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "csv": "csv"
            }
            """;

        const string mockResponse = """
            {
              "created": 1,
              "dryRun": true,
              "rows": [
                {
                  "_tag": "created",
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
                    "targets": [
                      {
                        "channelId": "channelId",
                        "id": "id",
                        "round": 1,
                        "status": "pending"
                      }
                    ]
                  },
                  "replayed": true,
                  "row": 1
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/import")
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

        var response = await Client.Posts.ImportAsync(
            new PostImport { WorkspaceId = "workspaceId", Csv = "csv" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
