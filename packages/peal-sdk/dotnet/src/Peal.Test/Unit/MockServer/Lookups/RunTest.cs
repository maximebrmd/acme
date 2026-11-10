using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Lookups;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RunTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "_tag": "youtubeVideoCategories",
              "items": [
                {
                  "id": "id",
                  "title": "title"
                },
                {
                  "id": "id",
                  "title": "title"
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId/lookups/name")
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

        var response = await Client.Lookups.RunAsync(
            new LookupInput
            {
                WorkspaceId = "workspaceId",
                ChannelId = "channelId",
                Name = "name",
                BoardId = null,
                Cursor = null,
                Language = null,
                Limit = null,
                RegionCode = null,
                VanityName = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "_tag": "youtubeVideoCategories",
              "items": [
                {
                  "id": "id",
                  "title": "title"
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId/lookups/name")
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

        var response = await Client.Lookups.RunAsync(
            new LookupInput
            {
                WorkspaceId = "workspaceId",
                ChannelId = "channelId",
                Name = "name",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
