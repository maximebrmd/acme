using NUnit.Framework;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.System;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ChangelogTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "entries": [
                {
                  "additions": 1,
                  "breaking": [
                    {
                      "change": "change",
                      "reason": "reason"
                    },
                    {
                      "change": "change",
                      "reason": "reason"
                    }
                  ],
                  "date": "date",
                  "deprecations": [
                    "deprecations",
                    "deprecations"
                  ],
                  "operations": [
                    "operations",
                    "operations"
                  ],
                  "title": "title"
                },
                {
                  "additions": 1,
                  "breaking": [
                    {
                      "change": "change",
                      "reason": "reason"
                    },
                    {
                      "change": "change",
                      "reason": "reason"
                    }
                  ],
                  "date": "date",
                  "deprecations": [
                    "deprecations",
                    "deprecations"
                  ],
                  "operations": [
                    "operations",
                    "operations"
                  ],
                  "title": "title"
                }
              ]
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/api/changelog").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.System.ChangelogAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "entries": [
                {
                  "additions": 1,
                  "breaking": [
                    {
                      "change": "change",
                      "reason": "reason"
                    }
                  ],
                  "date": "date",
                  "deprecations": [
                    "deprecations"
                  ],
                  "operations": [
                    "operations"
                  ],
                  "title": "title"
                }
              ]
            }
            """;

        Server
            .Given(WireMock.RequestBuilders.Request.Create().WithPath("/api/changelog").UsingGet())
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.System.ChangelogAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }
}
