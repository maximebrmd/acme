using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Media;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "aiGenerated": true,
              "altText": "altText",
              "byteSize": 1000000,
              "codec": "codec",
              "contentType": "image/gif",
              "createdAt": "createdAt",
              "dimensions": {
                "height": 1,
                "width": 1
              },
              "durationMs": 1,
              "fileName": "fileName",
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
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Media.GetAsync(
            new GetMediaRequest { WorkspaceId = "workspaceId", MediaId = "mediaId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "aiGenerated": true,
              "altText": "altText",
              "byteSize": 1000000,
              "codec": "codec",
              "contentType": "image/gif",
              "createdAt": "createdAt",
              "dimensions": {
                "height": 1,
                "width": 1
              },
              "durationMs": 1,
              "fileName": "fileName",
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
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Media.GetAsync(
            new GetMediaRequest { WorkspaceId = "workspaceId", MediaId = "mediaId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
