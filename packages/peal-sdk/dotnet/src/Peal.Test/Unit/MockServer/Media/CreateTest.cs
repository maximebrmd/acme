using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Media;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "byteSize": 1,
              "contentType": "contentType"
            }
            """;

        const string mockResponse = """
            {
              "media": {
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
              },
              "upload": {
                "_tag": "single",
                "expiresAt": "expiresAt",
                "request": {
                  "headers": {
                    "headers": "headers"
                  },
                  "method": "PUT",
                  "url": "url"
                }
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/media")
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

        var response = await Client.Media.CreateAsync(
            new NewUpload
            {
                WorkspaceId = "workspaceId",
                AltText = null,
                ByteSize = 1,
                ContentType = "contentType",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "byteSize": 1,
              "contentType": "contentType"
            }
            """;

        const string mockResponse = """
            {
              "media": {
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
              },
              "upload": {
                "_tag": "single",
                "expiresAt": "expiresAt",
                "request": {
                  "headers": {
                    "key": "value"
                  },
                  "method": "PUT",
                  "url": "url"
                }
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/media")
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

        var response = await Client.Media.CreateAsync(
            new NewUpload
            {
                WorkspaceId = "workspaceId",
                ByteSize = 1,
                ContentType = "contentType",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
