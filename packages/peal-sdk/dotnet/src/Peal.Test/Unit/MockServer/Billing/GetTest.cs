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
                "mediaStorage": 1,
                "members": 1,
                "scheduledPosts": 1
              },
              "currency": "currency",
              "enabled": true,
              "plan": "free",
              "plans": [
                {
                  "allowances": {
                    "assistantRequests": 1,
                    "channels": 1,
                    "mediaStorage": 1,
                    "members": 1,
                    "scheduledPosts": 1
                  },
                  "plan": "free",
                  "price": {
                    "month": 1,
                    "year": 1
                  }
                },
                {
                  "allowances": {
                    "assistantRequests": 1,
                    "channels": 1,
                    "mediaStorage": 1,
                    "members": 1,
                    "scheduledPosts": 1
                  },
                  "plan": "free",
                  "price": {
                    "month": 1,
                    "year": 1
                  }
                }
              ],
              "subscription": {
                "cancelAtPeriodEnd": true,
                "currentPeriodEnd": "currentPeriodEnd",
                "interval": "month",
                "plan": "starter",
                "startedAt": "startedAt",
                "status": "incomplete",
                "trialEnd": "trialEnd"
              },
              "trial": {
                "available": true,
                "days": 1,
                "plan": "starter"
              },
              "usage": {
                "assistantRequests": {
                  "resetsAt": "resetsAt",
                  "used": 1
                },
                "channels": 1,
                "mediaStorage": 1,
                "members": 1,
                "scheduledPosts": {
                  "resetsAt": "resetsAt",
                  "used": 1
                }
              },
              "vatRate": 1,
              "withdrawableUntil": "withdrawableUntil"
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
                "mediaStorage": 1,
                "members": 1,
                "scheduledPosts": 1
              },
              "currency": "currency",
              "enabled": true,
              "plan": "free",
              "plans": [
                {
                  "allowances": {},
                  "plan": "free",
                  "price": {
                    "month": 1,
                    "year": 1
                  }
                }
              ],
              "subscription": {
                "cancelAtPeriodEnd": true,
                "currentPeriodEnd": "currentPeriodEnd",
                "interval": "month",
                "plan": "starter",
                "startedAt": "startedAt",
                "status": "incomplete",
                "trialEnd": "trialEnd"
              },
              "trial": {
                "available": true,
                "days": 1,
                "plan": "starter"
              },
              "usage": {
                "assistantRequests": {
                  "resetsAt": "resetsAt",
                  "used": 1
                },
                "channels": 1,
                "mediaStorage": 1,
                "members": 1,
                "scheduledPosts": {
                  "resetsAt": "resetsAt",
                  "used": 1
                }
              },
              "vatRate": 1,
              "withdrawableUntil": "withdrawableUntil"
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
