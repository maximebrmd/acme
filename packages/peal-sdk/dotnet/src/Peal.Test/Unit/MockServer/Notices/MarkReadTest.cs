using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Notices;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class MarkReadTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "ids": [
                "ids",
                "ids"
              ]
            }
            """;

        const string mockResponse = """
            {
              "unread": 1
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/me/notices/read")
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

        var response = await Client.Notices.MarkReadAsync(
            new MarkNoticesRead
            {
                Ids = new List<string>() { "ids", "ids" },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "ids": [
                "ids"
              ]
            }
            """;

        const string mockResponse = """
            {
              "unread": 1
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/me/notices/read")
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

        var response = await Client.Notices.MarkReadAsync(
            new MarkNoticesRead { Ids = new List<string>() { "ids" } }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
