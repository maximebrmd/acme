using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Billing;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "allowances": {
                "assistantRequests": 1,
                "channels": 1,
                "members": 1,
                "scheduledPosts": 1
              },
              "enabled": true,
              "plan": "free",
              "plans": [
                {
                  "allowances": {
                    "assistantRequests": 1,
                    "channels": 1,
                    "members": 1,
                    "scheduledPosts": 1
                  },
                  "plan": "free"
                },
                {
                  "allowances": {
                    "assistantRequests": 1,
                    "channels": 1,
                    "members": 1,
                    "scheduledPosts": 1
                  },
                  "plan": "free"
                }
              ],
              "subscription": {
                "cancelAtPeriodEnd": true,
                "currentPeriodEnd": "currentPeriodEnd",
                "plan": "pro",
                "status": "incomplete"
              },
              "usage": {
                "assistantRequests": {
                  "resetsAt": "resetsAt",
                  "used": 1
                },
                "channels": 1,
                "members": 1,
                "scheduledPosts": {
                  "resetsAt": "resetsAt",
                  "used": 1
                }
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/billing")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Billing.GetAsync(
            new GetBillingRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "allowances": {
                "assistantRequests": 1,
                "channels": 1,
                "members": 1,
                "scheduledPosts": 1
              },
              "enabled": true,
              "plan": "free",
              "plans": [
                {
                  "allowances": {},
                  "plan": "free"
                }
              ],
              "subscription": {
                "cancelAtPeriodEnd": true,
                "currentPeriodEnd": "currentPeriodEnd",
                "plan": "pro",
                "status": "incomplete"
              },
              "usage": {
                "assistantRequests": {
                  "resetsAt": "resetsAt",
                  "used": 1
                },
                "channels": 1,
                "members": 1,
                "scheduledPosts": {
                  "resetsAt": "resetsAt",
                  "used": 1
                }
              }
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/billing")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Billing.GetAsync(
            new GetBillingRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
