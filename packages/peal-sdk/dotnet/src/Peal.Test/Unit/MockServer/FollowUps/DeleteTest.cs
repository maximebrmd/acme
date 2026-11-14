using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;

namespace Peal.Test.Unit.MockServer.FollowUps;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class DeleteTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public void MockServerTest_1()
    {
        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/follow-ups/ruleId")
                    .UsingDelete()
            )
            .RespondWith(WireMock.ResponseBuilders.Response.Create().WithStatusCode(200));

        Assert.DoesNotThrowAsync(async () =>
            await Client.FollowUps.DeleteAsync(
                new DeleteFollowUpsRequest { WorkspaceId = "workspaceId", RuleId = "ruleId" }
            )
        );
    }

    [NUnit.Framework.Test]
    public void MockServerTest_2()
    {
        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/follow-ups/ruleId")
                    .UsingDelete()
            )
            .RespondWith(WireMock.ResponseBuilders.Response.Create().WithStatusCode(200));

        Assert.DoesNotThrowAsync(async () =>
            await Client.FollowUps.DeleteAsync(
                new DeleteFollowUpsRequest { WorkspaceId = "workspaceId", RuleId = "ruleId" }
            )
        );
    }
}
