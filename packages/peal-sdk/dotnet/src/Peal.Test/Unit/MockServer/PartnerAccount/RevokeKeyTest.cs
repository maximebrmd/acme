using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;

namespace Peal.Test.Unit.MockServer.PartnerAccount;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RevokeKeyTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public void MockServerTest_1()
    {
        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/partner/keys/partnerKeyId")
                    .UsingDelete()
            )
            .RespondWith(WireMock.ResponseBuilders.Response.Create().WithStatusCode(200));

        Assert.DoesNotThrowAsync(async () =>
            await Client.PartnerAccount.RevokeKeyAsync(
                new RevokeKeyPartnerAccountRequest
                {
                    WorkspaceId = "workspaceId",
                    PartnerKeyId = "partnerKeyId",
                }
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
                    .WithPath("/api/workspaces/workspaceId/partner/keys/partnerKeyId")
                    .UsingDelete()
            )
            .RespondWith(WireMock.ResponseBuilders.Response.Create().WithStatusCode(200));

        Assert.DoesNotThrowAsync(async () =>
            await Client.PartnerAccount.RevokeKeyAsync(
                new RevokeKeyPartnerAccountRequest
                {
                    WorkspaceId = "workspaceId",
                    PartnerKeyId = "partnerKeyId",
                }
            )
        );
    }
}
