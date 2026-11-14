using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Media;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UsageTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "drafts": [
                "drafts",
                "drafts"
              ],
              "scheduled": [
                "scheduled",
                "scheduled"
              ],
              "draftArticles": [
                "draftArticles",
                "draftArticles"
              ],
              "scheduledArticles": [
                "scheduledArticles",
                "scheduledArticles"
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/media/mediaId/usage")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Media.UsageAsync(
            new UsageMediaRequest { WorkspaceId = "workspaceId", MediaId = "mediaId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "drafts": [
                "drafts"
              ],
              "scheduled": [
                "scheduled"
              ],
              "draftArticles": [
                "draftArticles"
              ],
              "scheduledArticles": [
                "scheduledArticles"
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/media/mediaId/usage")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Media.UsageAsync(
            new UsageMediaRequest { WorkspaceId = "workspaceId", MediaId = "mediaId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
