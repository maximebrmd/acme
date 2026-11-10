using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Tags;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "colour": "gray",
              "name": "x"
            }
            """;

        const string mockResponse = """
            {
              "colour": "gray",
              "createdAt": "createdAt",
              "id": "id",
              "name": "name"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/tags")
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

        var response = await Client.Tags.CreateAsync(
            new CreateTagsRequest
            {
                WorkspaceId = "workspaceId",
                Body = new TagDetails { Colour = TagColour.Gray, Name = "x" },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "colour": "gray",
              "name": "name"
            }
            """;

        const string mockResponse = """
            {
              "colour": "gray",
              "createdAt": "createdAt",
              "id": "id",
              "name": "name"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/tags")
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

        var response = await Client.Tags.CreateAsync(
            new CreateTagsRequest
            {
                WorkspaceId = "workspaceId",
                Body = new TagDetails { Colour = TagColour.Gray, Name = "name" },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
