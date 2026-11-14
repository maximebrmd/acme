using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Assistant;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class StatusTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "available": true,
              "dailyLimit": 1,
              "images": {
                "aspects": [
                  "square",
                  "square"
                ],
                "available": true,
                "dailyLimit": 1,
                "maxPromptLength": 1,
                "requestCost": 1,
                "month": {
                  "allowance": 1,
                  "ceiling": {
                    "amount": 1,
                    "currency": "currency"
                  },
                  "most": 1,
                  "price": {
                    "cents": 1,
                    "per": 1
                  },
                  "priceConfirmed": true,
                  "resetsAt": "resetsAt",
                  "used": 1
                },
                "reason": "paymentMethod",
                "source": "workspace"
              },
              "maxTextLength": 1,
              "month": {
                "allowance": 1,
                "ceiling": {
                  "amount": 1,
                  "currency": "currency"
                },
                "most": 1,
                "price": {
                  "cents": 1,
                  "per": 1
                },
                "priceConfirmed": true,
                "resetsAt": "resetsAt",
                "used": 1
              },
              "reason": "paymentMethod",
              "remaining": 1,
              "resetsAt": "resetsAt",
              "source": "workspace"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/assistant")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Assistant.StatusAsync(
            new StatusAssistantRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "available": true,
              "dailyLimit": 1,
              "images": {
                "aspects": [
                  "square"
                ],
                "available": true,
                "dailyLimit": 1,
                "maxPromptLength": 1,
                "requestCost": 1,
                "month": {
                  "allowance": 1,
                  "ceiling": {
                    "amount": 1,
                    "currency": "currency"
                  },
                  "most": 1,
                  "price": {
                    "cents": 1,
                    "per": 1
                  },
                  "priceConfirmed": true,
                  "resetsAt": "resetsAt",
                  "used": 1
                },
                "reason": "paymentMethod",
                "source": "workspace"
              },
              "maxTextLength": 1,
              "month": {
                "allowance": 1,
                "ceiling": {
                  "amount": 1,
                  "currency": "currency"
                },
                "most": 1,
                "price": {
                  "cents": 1,
                  "per": 1
                },
                "priceConfirmed": true,
                "resetsAt": "resetsAt",
                "used": 1
              },
              "reason": "paymentMethod",
              "remaining": 1,
              "resetsAt": "resetsAt",
              "source": "workspace"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/assistant")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Assistant.StatusAsync(
            new StatusAssistantRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
