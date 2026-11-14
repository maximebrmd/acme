using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.ConnectLinks;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            [
              {
                "channelId": "channelId",
                "channelIds": [
                  "channelIds",
                  "channelIds"
                ],
                "connectedPlatforms": [
                  "x",
                  "x"
                ],
                "completedAt": "completedAt",
                "createdAt": "createdAt",
                "expiresAt": "expiresAt",
                "failedAt": "failedAt",
                "failure": "platformNotSupported",
                "id": "id",
                "platform": "x",
                "platforms": [
                  "x",
                  "x"
                ],
                "returnUrl": "returnUrl",
                "status": "pending"
              },
              {
                "channelId": "channelId",
                "channelIds": [
                  "channelIds",
                  "channelIds"
                ],
                "connectedPlatforms": [
                  "x",
                  "x"
                ],
                "completedAt": "completedAt",
                "createdAt": "createdAt",
                "expiresAt": "expiresAt",
                "failedAt": "failedAt",
                "failure": "platformNotSupported",
                "id": "id",
                "platform": "x",
                "platforms": [
                  "x",
                  "x"
                ],
                "returnUrl": "returnUrl",
                "status": "pending"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/connect-links")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.ConnectLinks.ListAsync(
            new ListConnectLinksRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            [
              {
                "channelId": "channelId",
                "channelIds": [
                  "channelIds"
                ],
                "connectedPlatforms": [
                  "x"
                ],
                "completedAt": "completedAt",
                "createdAt": "createdAt",
                "expiresAt": "expiresAt",
                "failedAt": "failedAt",
                "failure": "platformNotSupported",
                "id": "id",
                "platform": "x",
                "platforms": [
                  "x"
                ],
                "returnUrl": "returnUrl",
                "status": "pending"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/connect-links")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.ConnectLinks.ListAsync(
            new ListConnectLinksRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
