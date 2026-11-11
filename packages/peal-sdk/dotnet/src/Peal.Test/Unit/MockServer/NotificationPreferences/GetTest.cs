using NUnit.Framework;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.NotificationPreferences;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "email": {
                "channelReconnect": true,
                "comments": true,
                "postFailed": true,
                "postPublished": true,
                "postReview": true,
                "postUnconfirmed": true,
                "webhookFailing": true
              },
              "everyPost": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/me/notification-preferences")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.NotificationPreferences.GetAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "email": {
                "channelReconnect": true,
                "comments": true,
                "postFailed": true,
                "postPublished": true,
                "postReview": true,
                "postUnconfirmed": true,
                "webhookFailing": true
              },
              "everyPost": true
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/me/notification-preferences")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.NotificationPreferences.GetAsync();
        JsonAssert.AreEqual(response, mockResponse);
    }
}
