using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Signatures;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class CreateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "name": "x",
              "text": "x"
            }
            """;

        const string mockResponse = """
            {
              "createdAt": "createdAt",
              "id": "id",
              "isDefault": true,
              "name": "name",
              "scope": {
                "_tag": "workspace"
              },
              "text": "text"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/signatures")
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

        var response = await Client.Signatures.CreateAsync(
            new CreateSignaturesRequest
            {
                WorkspaceId = "workspaceId",
                Body = new SignatureDetails
                {
                    IsDefault = null,
                    Name = "x",
                    Scope = null,
                    Text = "x",
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "name": "name",
              "text": "text"
            }
            """;

        const string mockResponse = """
            {
              "createdAt": "createdAt",
              "id": "id",
              "isDefault": true,
              "name": "name",
              "scope": {
                "_tag": "workspace"
              },
              "text": "text"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/signatures")
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

        var response = await Client.Signatures.CreateAsync(
            new CreateSignaturesRequest
            {
                WorkspaceId = "workspaceId",
                Body = new SignatureDetails { Name = "name", Text = "text" },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
