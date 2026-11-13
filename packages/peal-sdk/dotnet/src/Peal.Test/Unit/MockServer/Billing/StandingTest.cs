using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Billing;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class StandingTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "account": {
                "billingWorkspaceId": "billingWorkspaceId",
                "billingWorkspaceName": "billingWorkspaceName",
                "id": "id",
                "otherWorkspaces": [
                  {
                    "name": "name",
                    "workspaceId": "workspaceId"
                  },
                  {
                    "name": "name",
                    "workspaceId": "workspaceId"
                  }
                ],
                "partner": true,
                "payer": true,
                "transfer": {
                  "expiresAt": "expiresAt",
                  "offeredAt": "offeredAt",
                  "offeredBy": "offeredBy",
                  "toUserId": "toUserId"
                },
                "workspaces": 1
              },
              "graceUntil": "graceUntil",
              "mustReduce": true,
              "over": [
                {
                  "allowed": 1000000,
                  "limit": "channels",
                  "used": 1000000
                },
                {
                  "allowed": 1000000,
                  "limit": "channels",
                  "used": 1000000
                }
              ],
              "plan": "free",
              "planWithRoom": "starter",
              "scheduledPosts": 1
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/billing/standing")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Billing.StandingAsync(
            new StandingBillingRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "account": {
                "billingWorkspaceId": "billingWorkspaceId",
                "billingWorkspaceName": "billingWorkspaceName",
                "id": "id",
                "otherWorkspaces": [
                  {
                    "name": "name",
                    "workspaceId": "workspaceId"
                  }
                ],
                "partner": true,
                "payer": true,
                "transfer": {
                  "expiresAt": "expiresAt",
                  "offeredAt": "offeredAt",
                  "offeredBy": "offeredBy",
                  "toUserId": "toUserId"
                },
                "workspaces": 1
              },
              "graceUntil": "graceUntil",
              "mustReduce": true,
              "over": [
                {
                  "allowed": 1000000,
                  "limit": "channels",
                  "used": 1000000
                }
              ],
              "plan": "free",
              "planWithRoom": "starter",
              "scheduledPosts": 1
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/billing/standing")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Billing.StandingAsync(
            new StandingBillingRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
