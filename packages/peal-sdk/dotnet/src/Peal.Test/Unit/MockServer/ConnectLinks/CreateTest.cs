using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.ConnectLinks;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {}
            """;

        const string mockResponse = """
            {
              "link": {
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
              "url": "url"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/connect-links")
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

        var response = await Client.ConnectLinks.CreateAsync(
            new NewConnectLink
            {
                WorkspaceId = "workspaceId",
                ChannelId = null,
                Connection = null,
                ExpiresInHours = null,
                Locale = null,
                Platform = null,
                Platforms = null,
                ReturnUrl = null,
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
              "link": {
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
              },
              "url": "url"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/connect-links")
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

        var response = await Client.ConnectLinks.CreateAsync(
            new NewConnectLink { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
