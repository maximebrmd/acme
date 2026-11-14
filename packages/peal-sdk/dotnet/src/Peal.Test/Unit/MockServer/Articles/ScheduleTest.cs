using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Articles;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ScheduleTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "timeZone": "timeZone"
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
                    .WithPath("/api/workspaces/workspaceId/articles/articleId/schedule")
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

        var response = await Client.Articles.ScheduleAsync(
            new ScheduleArticlesRequest
            {
                WorkspaceId = "workspaceId",
                ArticleId = "articleId",
                Body = new ArticleTime { At = null, TimeZone = "timeZone" },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "timeZone": "timeZone"
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
                    .WithPath("/api/workspaces/workspaceId/articles/articleId/schedule")
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

        var response = await Client.Articles.ScheduleAsync(
            new ScheduleArticlesRequest
            {
                WorkspaceId = "workspaceId",
                ArticleId = "articleId",
                Body = new ArticleTime { TimeZone = "timeZone" },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
