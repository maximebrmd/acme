using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Notices;

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
                  "createdAt": "createdAt",
                  "event": {
                    "_tag": "PostPublished",
                    "channel": {
                      "handle": "handle",
                      "platform": "x"
                    },
                    "permalink": "permalink",
                    "postId": "postId"
                  },
                  "id": "id",
                  "readAt": "readAt",
                  "workspaceId": "workspaceId"
                },
                {
                  "createdAt": "createdAt",
                  "event": {
                    "_tag": "PostPublished",
                    "channel": {
                      "handle": "handle",
                      "platform": "x"
                    },
                    "permalink": "permalink",
                    "postId": "postId"
                  },
                  "id": "id",
                  "readAt": "readAt",
                  "workspaceId": "workspaceId"
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/api/me/notices").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Notices.ListAsync(new ListNoticesRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "items": [
                {
                  "createdAt": "createdAt",
                  "event": {
                    "_tag": "PostPublished",
                    "postId": "postId"
                  },
                  "id": "id",
                  "readAt": "readAt",
                  "workspaceId": "workspaceId"
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/api/me/notices").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Notices.ListAsync(new ListNoticesRequest());
        JsonAssert.AreEqual(response, mockResponse);
    }
}
