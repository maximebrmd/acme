using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Channels;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ChooseAccountsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "accountIds": [
                "accountIds",
                "accountIds"
              ],
              "selection": "x"
            }
            """;

        const string mockResponse = """
            [
              {
                "avatarUrl": "avatarUrl",
                "connection": "instagramLogin",
                "displayName": "displayName",
                "handle": "handle",
                "id": "id",
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
                "platform": "x",
                "status": {
                  "_tag": "active"
                },
                "tokenExpiresAt": "tokenExpiresAt"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/connect/x/accounts")
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

        var response = await Client.Channels.ChooseAccountsAsync(
            new ChooseAccounts
            {
                WorkspaceId = "workspaceId",
                Platform = Platform.X,
                AccountIds = new List<string>() { "accountIds", "accountIds" },
                Selection = "x",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "accountIds": [
                "accountIds"
              ],
              "selection": "selection"
            }
            """;

        const string mockResponse = """
            [
              {
                "avatarUrl": "avatarUrl",
                "connection": "instagramLogin",
                "displayName": "displayName",
                "handle": "handle",
                "id": "id",
                "platform": "x",
                "status": {
                  "_tag": "active"
                },
                "tokenExpiresAt": "tokenExpiresAt"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/connect/x/accounts")
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

        var response = await Client.Channels.ChooseAccountsAsync(
            new ChooseAccounts
            {
                WorkspaceId = "workspaceId",
                Platform = Platform.X,
                AccountIds = new List<string>() { "accountIds" },
                Selection = "selection",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
