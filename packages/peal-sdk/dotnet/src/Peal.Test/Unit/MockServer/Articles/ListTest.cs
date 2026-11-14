using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Articles;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "items": [
                {
                  "authorId": "authorId",
                  "body": {
                    "content": [
                      {
                        "key": "value"
                      },
                      {
                        "key": "value"
                      }
                    ],
                    "type": "doc"
                  },
                  "categories": [
                    "categories",
                    "categories"
                  ],
                  "channelId": "channelId",
                  "coverMediaId": "coverMediaId",
                  "createdAt": "createdAt",
                  "excerpt": "excerpt",
                  "id": "id",
                  "siteStatus": "publish",
                  "state": {
                    "_tag": "draft"
                  },
                  "tags": [
                    "tags",
                    "tags"
                  ],
                  "title": "title",
                  "updatedAt": "updatedAt"
                },
                {
                  "authorId": "authorId",
                  "body": {
                    "content": [
                      {
                        "key": "value"
                      },
                      {
                        "key": "value"
                      }
                    ],
                    "type": "doc"
                  },
                  "categories": [
                    "categories",
                    "categories"
                  ],
                  "channelId": "channelId",
                  "coverMediaId": "coverMediaId",
                  "createdAt": "createdAt",
                  "excerpt": "excerpt",
                  "id": "id",
                  "siteStatus": "publish",
                  "state": {
                    "_tag": "draft"
                  },
                  "tags": [
                    "tags",
                    "tags"
                  ],
                  "title": "title",
                  "updatedAt": "updatedAt"
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/articles")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Articles.ListAsync(
            new ListArticlesRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "items": [
                {
                  "authorId": "authorId",
                  "body": {
                    "content": [],
                    "type": "doc"
                  },
                  "categories": [
                    "categories"
                  ],
                  "channelId": "channelId",
                  "coverMediaId": "coverMediaId",
                  "createdAt": "createdAt",
                  "excerpt": "excerpt",
                  "id": "id",
                  "siteStatus": "publish",
                  "state": {
                    "_tag": "draft"
                  },
                  "tags": [
                    "tags"
                  ],
                  "title": "title",
                  "updatedAt": "updatedAt"
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/articles")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Articles.ListAsync(
            new ListArticlesRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
