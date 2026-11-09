using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Assistant;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class SuggestTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "action": {
                "_tag": "rewrite",
                "tone": "professional"
              },
              "text": "text"
            }
            """;

        const string mockResponse = """
            {
              "_tag": "text",
              "text": "text"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/assistant/suggestions")
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

        var response = await Client.Assistant.SuggestAsync(
            new SuggestionRequest
            {
                WorkspaceId = "workspaceId",
                Action = new AssistantAction(
                    new AssistantAction.Rewrite(
                        new AssistantActionRewrite { Tone = AssistantTone.Professional }
                    )
                ),
                Text = "text",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "action": {
                "_tag": "rewrite",
                "tone": "professional"
              },
              "text": "text"
            }
            """;

        const string mockResponse = """
            {
              "_tag": "text",
              "text": "text"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/assistant/suggestions")
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

        var response = await Client.Assistant.SuggestAsync(
            new SuggestionRequest
            {
                WorkspaceId = "workspaceId",
                Action = new AssistantAction(
                    new AssistantAction.Rewrite(
                        new AssistantActionRewrite { Tone = AssistantTone.Professional }
                    )
                ),
                Text = "text",
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
