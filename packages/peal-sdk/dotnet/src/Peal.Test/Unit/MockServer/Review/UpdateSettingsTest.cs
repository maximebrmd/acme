using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Review;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class UpdateSettingsTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "approvalPolicy": "never"
            }
            """;

        const string mockResponse = """
            {
              "approvalPolicy": "never"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/review/settings")
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

        var response = await Client.Review.UpdateSettingsAsync(
            new UpdateSettingsReviewRequest
            {
                WorkspaceId = "workspaceId",
                Body = new ReviewSettings { ApprovalPolicy = ApprovalPolicy.Never },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "approvalPolicy": "never"
            }
            """;

        const string mockResponse = """
            {
              "approvalPolicy": "never"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/review/settings")
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

        var response = await Client.Review.UpdateSettingsAsync(
            new UpdateSettingsReviewRequest
            {
                WorkspaceId = "workspaceId",
                Body = new ReviewSettings { ApprovalPolicy = ApprovalPolicy.Never },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
