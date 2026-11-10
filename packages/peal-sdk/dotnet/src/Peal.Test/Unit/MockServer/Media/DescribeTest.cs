using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Media;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class DescribeTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "altText": "altText",
              "byteSize": 1,
              "codec": "codec",
              "contentType": "image/gif",
              "createdAt": "createdAt",
              "dimensions": {
                "height": 1,
                "width": 1
              },
              "durationMs": 1,
              "id": "id",
              "kind": "image",
              "pageCount": 1,
              "status": {
                "_tag": "pending"
              },
              "updatedAt": "updatedAt",
              "url": "url"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/media/mediaId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Media.DescribeAsync(
            new MediaDescription
            {
                WorkspaceId = "workspaceId",
                MediaId = "mediaId",
                AltText = null,
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
              "altText": "altText",
              "byteSize": 1,
              "codec": "codec",
              "contentType": "image/gif",
              "createdAt": "createdAt",
              "dimensions": {
                "height": 1,
                "width": 1
              },
              "durationMs": 1,
              "id": "id",
              "kind": "image",
              "pageCount": 1,
              "status": {
                "_tag": "pending"
              },
              "updatedAt": "updatedAt",
              "url": "url"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/media/mediaId")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPatch()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Media.DescribeAsync(
            new MediaDescription
            {
                WorkspaceId = "workspaceId",
                MediaId = "mediaId",
                AltText = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
