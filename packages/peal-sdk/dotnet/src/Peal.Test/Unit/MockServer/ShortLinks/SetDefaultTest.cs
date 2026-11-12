using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.ShortLinks;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SetDefaultTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "byDefault": true
            }
            """;

        const string mockResponse = """
            {
              "available": true,
              "base": "base",
              "byDefault": true,
              "shortLength": 1
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/short-links/settings")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPut()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.ShortLinks.SetDefaultAsync(
            new ShortLinkSettings { WorkspaceId = "workspaceId", ByDefault = true }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "byDefault": true
            }
            """;

        const string mockResponse = """
            {
              "available": true,
              "base": "base",
              "byDefault": true,
              "shortLength": 1
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/short-links/settings")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPut()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.ShortLinks.SetDefaultAsync(
            new ShortLinkSettings { WorkspaceId = "workspaceId", ByDefault = true }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
