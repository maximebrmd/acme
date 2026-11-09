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
