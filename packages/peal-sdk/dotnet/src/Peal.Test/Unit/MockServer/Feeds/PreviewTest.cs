using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Feeds;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class PreviewTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "url": "url"
            }
            """;

        const string mockResponse = """
            {
              "items": [
                {
                  "link": "link",
                  "picture": "picture",
                  "publishedAt": "publishedAt",
                  "summary": "summary",
                  "text": "text",
                  "title": "title"
                },
                {
                  "link": "link",
                  "picture": "picture",
                  "publishedAt": "publishedAt",
                  "summary": "summary",
                  "text": "text",
                  "title": "title"
                }
              ],
              "title": "title"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/feeds/preview")
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

        var response = await Client.Feeds.PreviewAsync(
            new FeedPreviewRequest
            {
                WorkspaceId = "workspaceId",
                Template = null,
                Url = "url",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "url": "url"
            }
            """;

        const string mockResponse = """
            {
              "items": [
                {
                  "link": "link",
                  "picture": "picture",
                  "publishedAt": "publishedAt",
                  "summary": "summary",
                  "text": "text",
                  "title": "title"
                }
              ],
              "title": "title"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/feeds/preview")
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

        var response = await Client.Feeds.PreviewAsync(
            new FeedPreviewRequest { WorkspaceId = "workspaceId", Url = "url" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
