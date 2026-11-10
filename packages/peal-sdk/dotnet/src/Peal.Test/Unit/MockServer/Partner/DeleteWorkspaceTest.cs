using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;

namespace Peal.Test.Unit.MockServer.Partner;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class DeleteWorkspaceTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public void MockServerTest_1()
    {
        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/partner/workspaces/workspaceId")
                    .UsingDelete()
            )
            .RespondWith(WireMock.ResponseBuilders.Response.Create().WithStatusCode(200));

        Assert.DoesNotThrowAsync(async () =>
            await Client.Partner.DeleteWorkspaceAsync(
                new DeleteWorkspacePartnerRequest { WorkspaceId = "workspaceId" }
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
                    .WithPath("/api/partner/workspaces/workspaceId")
                    .UsingDelete()
            )
            .RespondWith(WireMock.ResponseBuilders.Response.Create().WithStatusCode(200));

        Assert.DoesNotThrowAsync(async () =>
            await Client.Partner.DeleteWorkspaceAsync(
                new DeleteWorkspacePartnerRequest { WorkspaceId = "workspaceId" }
            )
        );
    }
}
