using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.ShortLinks;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "items": [
                {
                  "channelId": "channelId",
                  "clicks": 1,
                  "createdAt": "createdAt",
                  "destination": "destination",
                  "disabled": true,
                  "id": "id",
                  "part": 1,
                  "postId": "postId",
                  "shortUrl": "shortUrl",
                  "targetId": "targetId"
                },
                {
                  "channelId": "channelId",
                  "clicks": 1,
                  "createdAt": "createdAt",
                  "destination": "destination",
                  "disabled": true,
                  "id": "id",
                  "part": 1,
                  "postId": "postId",
                  "shortUrl": "shortUrl",
                  "targetId": "targetId"
                }
              ],
              "nextCursor": "nextCursor",
              "period": {
                "from": "from",
                "to": "to"
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/short-links")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.ShortLinks.ListAsync(
            new ListShortLinksRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "items": [
                {
                  "channelId": "channelId",
                  "clicks": 1,
                  "createdAt": "createdAt",
                  "destination": "destination",
                  "disabled": true,
                  "id": "id",
                  "part": 1,
                  "postId": "postId",
                  "shortUrl": "shortUrl",
                  "targetId": "targetId"
                }
              ],
              "nextCursor": "nextCursor",
              "period": {
                "from": "from",
                "to": "to"
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/short-links")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.ShortLinks.ListAsync(
            new ListShortLinksRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
