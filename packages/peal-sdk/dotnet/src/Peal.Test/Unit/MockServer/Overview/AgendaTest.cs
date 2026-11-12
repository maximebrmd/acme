using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Overview;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class AgendaTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "items": [
                {
                  "excerpt": "excerpt",
                  "platforms": [
                    "x",
                    "x"
                  ],
                  "postId": "postId",
                  "scheduledAt": "scheduledAt",
                  "status": "draft",
                  "timeZone": "timeZone",
                  "workspaceId": "workspaceId"
                },
                {
                  "excerpt": "excerpt",
                  "platforms": [
                    "x",
                    "x"
                  ],
                  "postId": "postId",
                  "scheduledAt": "scheduledAt",
                  "status": "draft",
                  "timeZone": "timeZone",
                  "workspaceId": "workspaceId"
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/me/agenda")
                    .WithParam("from", "from")
                    .WithParam("to", "to")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Overview.AgendaAsync(
            new AgendaOverviewRequest { From = "from", To = "to" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "items": [
                {
                  "excerpt": "excerpt",
                  "platforms": [
                    "x"
                  ],
                  "postId": "postId",
                  "scheduledAt": "scheduledAt",
                  "status": "draft",
                  "timeZone": "timeZone",
                  "workspaceId": "workspaceId"
                }
              ],
              "nextCursor": "nextCursor"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/me/agenda")
                    .WithParam("from", "from")
                    .WithParam("to", "to")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Overview.AgendaAsync(
            new AgendaOverviewRequest { From = "from", To = "to" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
