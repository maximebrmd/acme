using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Articles;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
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
              "title": "title",
              "channelId": "channelId"
            }
            """;

        const string mockResponse = """
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/articles")
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

        var response = await Client.Articles.CreateAsync(
            new NewArticle
            {
                WorkspaceId = "workspaceId",
                Body = new ArticleBody
                {
                    Content = new List<object>()
                    {
                        new Dictionary<object, object?>() { { "key", "value" } },
                        new Dictionary<object, object?>() { { "key", "value" } },
                    },
                    Type = ArticleBodyType.Doc,
                },
                Categories = null,
                CoverMediaId = null,
                Excerpt = null,
                SiteStatus = null,
                Tags = null,
                Title = "title",
                ChannelId = "channelId",
                Schedule = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "body": {
                "content": [],
                "type": "doc"
              },
              "title": "title",
              "channelId": "channelId"
            }
            """;

        const string mockResponse = """
            {
              "authorId": "authorId",
              "body": {
                "content": [
                  {
                    "key": "value"
                  }
                ],
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/articles")
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

        var response = await Client.Articles.CreateAsync(
            new NewArticle
            {
                WorkspaceId = "workspaceId",
                Body = new ArticleBody
                {
                    Content = new List<object>() { },
                    Type = ArticleBodyType.Doc,
                },
                Title = "title",
                ChannelId = "channelId",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
