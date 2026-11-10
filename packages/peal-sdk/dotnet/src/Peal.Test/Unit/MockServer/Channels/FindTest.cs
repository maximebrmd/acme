using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Channels;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class FindTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "counts": {
                "active": 1,
                "disabled": 1,
                "refreshNeeded": 1
              },
              "items": [
                {
                  "avatarUrl": "avatarUrl",
                  "connection": "instagramLogin",
                  "displayName": "displayName",
                  "handle": "handle",
                  "id": "id",
                  "label": "label",
                  "platform": "x",
                  "status": {
                    "_tag": "active"
                  },
                  "tokenExpiresAt": "tokenExpiresAt"
                },
                {
                  "avatarUrl": "avatarUrl",
                  "connection": "instagramLogin",
                  "displayName": "displayName",
                  "handle": "handle",
                  "id": "id",
                  "label": "label",
                  "platform": "x",
                  "status": {
                    "_tag": "active"
                  },
                  "tokenExpiresAt": "tokenExpiresAt"
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/search")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Channels.FindAsync(
            new FindChannelsRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "counts": {
                "active": 1,
                "disabled": 1,
                "refreshNeeded": 1
              },
              "items": [
                {
                  "avatarUrl": "avatarUrl",
                  "connection": "instagramLogin",
                  "displayName": "displayName",
                  "handle": "handle",
                  "id": "id",
                  "label": "label",
                  "platform": "x",
                  "status": {
                    "_tag": "active"
                  },
                  "tokenExpiresAt": "tokenExpiresAt"
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/search")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Channels.FindAsync(
            new FindChannelsRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
