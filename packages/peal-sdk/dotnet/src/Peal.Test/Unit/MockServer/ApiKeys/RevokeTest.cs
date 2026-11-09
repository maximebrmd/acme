using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;

namespace Peal.Test.Unit.MockServer.ApiKeys;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class RevokeTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public void MockServerTest_1()
    {
        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/api-keys/apiKeyId")
                    .UsingDelete()
            )
            .RespondWith(WireMock.ResponseBuilders.Response.Create().WithStatusCode(200));

        Assert.DoesNotThrowAsync(async () =>
            await Client.ApiKeys.RevokeAsync(
                new RevokeApiKeysRequest { WorkspaceId = "workspaceId", ApiKeyId = "apiKeyId" }
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
                    .WithPath("/api/workspaces/workspaceId/api-keys/apiKeyId")
                    .UsingDelete()
            )
            .RespondWith(WireMock.ResponseBuilders.Response.Create().WithStatusCode(200));

        Assert.DoesNotThrowAsync(async () =>
            await Client.ApiKeys.RevokeAsync(
                new RevokeApiKeysRequest { WorkspaceId = "workspaceId", ApiKeyId = "apiKeyId" }
            )
        );
    }
}
