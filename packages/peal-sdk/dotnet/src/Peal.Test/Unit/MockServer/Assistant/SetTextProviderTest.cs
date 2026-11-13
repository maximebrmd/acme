using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Assistant;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SetTextProviderTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "baseUrl": "baseUrl",
              "kind": "anthropic",
              "model": "x"
            }
            """;

        const string mockResponse = """
            {
              "baseUrl": "baseUrl",
              "keySet": true,
              "keyUnreadable": true,
              "kind": "anthropic",
              "model": "model",
              "updatedAt": "updatedAt"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/assistant/text-provider")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPut()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Assistant.SetTextProviderAsync(
            new TextProviderChange
            {
                WorkspaceId = "workspaceId",
                ApiKey = null,
                BaseUrl = "baseUrl",
                Kind = TextProviderKind.Anthropic,
                Model = "x",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "baseUrl": "baseUrl",
              "kind": "anthropic",
              "model": "model"
            }
            """;

        const string mockResponse = """
            {
              "baseUrl": "baseUrl",
              "keySet": true,
              "keyUnreadable": true,
              "kind": "anthropic",
              "model": "model",
              "updatedAt": "updatedAt"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/assistant/text-provider")
                    .WithHeader("Content-Type", "application/json")
                    .UsingPut()
                    .WithBodyAsJson(requestJson)
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Assistant.SetTextProviderAsync(
            new TextProviderChange
            {
                WorkspaceId = "workspaceId",
                BaseUrl = "baseUrl",
                Kind = TextProviderKind.Anthropic,
                Model = "model",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
