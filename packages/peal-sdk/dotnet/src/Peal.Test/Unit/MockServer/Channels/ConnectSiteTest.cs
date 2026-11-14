using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Channels;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ConnectSiteTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "address": "x",
              "applicationPassword": "x",
              "platform": "wordpress",
              "userName": "x"
            }
            """;

        const string mockResponse = """
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/websites")
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

        var response = await Client.Channels.ConnectSiteAsync(
            new ConnectSite
            {
                WorkspaceId = "workspaceId",
                Address = "x",
                ApplicationPassword = "x",
                Platform = SitePlatform.Wordpress,
                UserName = "x",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "address": "address",
              "applicationPassword": "applicationPassword",
              "platform": "wordpress",
              "userName": "userName"
            }
            """;

        const string mockResponse = """
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
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/websites")
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

        var response = await Client.Channels.ConnectSiteAsync(
            new ConnectSite
            {
                WorkspaceId = "workspaceId",
                Address = "address",
                ApplicationPassword = "applicationPassword",
                Platform = SitePlatform.Wordpress,
                UserName = "userName",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
