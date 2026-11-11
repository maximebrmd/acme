using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Lookups;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ListTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            [
              {
                "fills": [
                  "fills",
                  "fills"
                ],
                "input": [
                  {
                    "contentTypes": [
                      "contentTypes",
                      "contentTypes"
                    ],
                    "forbiddenCharacters": [
                      "forbiddenCharacters",
                      "forbiddenCharacters"
                    ],
                    "ifLeftOut": true,
                    "lookup": "youtubeVideoCategories",
                    "maxByteSize": 1000000,
                    "maxLength": 1,
                    "maximum": 1,
                    "minimum": 1,
                    "name": "name",
                    "pattern": "pattern",
                    "required": true,
                    "type": "boolean",
                    "values": [
                      "values",
                      "values"
                    ]
                  },
                  {
                    "contentTypes": [
                      "contentTypes",
                      "contentTypes"
                    ],
                    "forbiddenCharacters": [
                      "forbiddenCharacters",
                      "forbiddenCharacters"
                    ],
                    "ifLeftOut": true,
                    "lookup": "youtubeVideoCategories",
                    "maxByteSize": 1000000,
                    "maxLength": 1,
                    "maximum": 1,
                    "minimum": 1,
                    "name": "name",
                    "pattern": "pattern",
                    "required": true,
                    "type": "boolean",
                    "values": [
                      "values",
                      "values"
                    ]
                  }
                ],
                "name": "youtubeVideoCategories",
                "paged": true,
                "platform": "x"
              },
              {
                "fills": [
                  "fills",
                  "fills"
                ],
                "input": [
                  {
                    "contentTypes": [
                      "contentTypes",
                      "contentTypes"
                    ],
                    "forbiddenCharacters": [
                      "forbiddenCharacters",
                      "forbiddenCharacters"
                    ],
                    "ifLeftOut": true,
                    "lookup": "youtubeVideoCategories",
                    "maxByteSize": 1000000,
                    "maxLength": 1,
                    "maximum": 1,
                    "minimum": 1,
                    "name": "name",
                    "pattern": "pattern",
                    "required": true,
                    "type": "boolean",
                    "values": [
                      "values",
                      "values"
                    ]
                  },
                  {
                    "contentTypes": [
                      "contentTypes",
                      "contentTypes"
                    ],
                    "forbiddenCharacters": [
                      "forbiddenCharacters",
                      "forbiddenCharacters"
                    ],
                    "ifLeftOut": true,
                    "lookup": "youtubeVideoCategories",
                    "maxByteSize": 1000000,
                    "maxLength": 1,
                    "maximum": 1,
                    "minimum": 1,
                    "name": "name",
                    "pattern": "pattern",
                    "required": true,
                    "type": "boolean",
                    "values": [
                      "values",
                      "values"
                    ]
                  }
                ],
                "name": "youtubeVideoCategories",
                "paged": true,
                "platform": "x"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId/lookups")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Lookups.ListAsync(
            new ListLookupsRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            [
              {
                "fills": [
                  "fills"
                ],
                "input": [
                  {
                    "contentTypes": [
                      "contentTypes"
                    ],
                    "forbiddenCharacters": [
                      "forbiddenCharacters"
                    ],
                    "name": "name",
                    "required": true,
                    "type": "boolean",
                    "values": [
                      "values"
                    ]
                  }
                ],
                "name": "youtubeVideoCategories",
                "paged": true,
                "platform": "x"
              }
            ]
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId/lookups")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Lookups.ListAsync(
            new ListLookupsRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
