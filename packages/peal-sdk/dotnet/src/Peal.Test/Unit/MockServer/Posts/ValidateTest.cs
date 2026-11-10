using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Posts;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ValidateTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string requestJson = """
            {
              "channelIds": [
                "channelIds",
                "channelIds"
              ],
              "content": {
                "media": [
                  {
                    "altText": "altText",
                    "mediaId": "mediaId"
                  },
                  {
                    "altText": "altText",
                    "mediaId": "mediaId"
                  }
                ],
                "overrides": [
                  {
                    "channelId": "channelId",
                    "text": "x"
                  },
                  {
                    "channelId": "channelId",
                    "text": "x"
                  }
                ],
                "text": "text"
              }
            }
            """;

        const string mockResponse = """
            {
              "channels": [
                {
                  "channelId": "channelId",
                  "hashtags": {
                    "count": 1,
                    "maximum": 1
                  },
                  "links": {
                    "count": 1,
                    "maximum": 1
                  },
                  "media": {
                    "count": 1,
                    "maximum": 1
                  },
                  "mentions": {
                    "count": 1,
                    "maximum": 1
                  },
                  "platform": "x",
                  "text": "text",
                  "textCounts": [
                    {
                      "length": 1,
                      "maximum": 1,
                      "unit": "graphemes"
                    },
                    {
                      "length": 1,
                      "maximum": 1,
                      "unit": "graphemes"
                    }
                  ],
                  "violations": [
                    {
                      "_tag": "noChannels"
                    },
                    {
                      "_tag": "noChannels"
                    }
                  ]
                },
                {
                  "channelId": "channelId",
                  "hashtags": {
                    "count": 1,
                    "maximum": 1
                  },
                  "links": {
                    "count": 1,
                    "maximum": 1
                  },
                  "media": {
                    "count": 1,
                    "maximum": 1
                  },
                  "mentions": {
                    "count": 1,
                    "maximum": 1
                  },
                  "platform": "x",
                  "text": "text",
                  "textCounts": [
                    {
                      "length": 1,
                      "maximum": 1,
                      "unit": "graphemes"
                    },
                    {
                      "length": 1,
                      "maximum": 1,
                      "unit": "graphemes"
                    }
                  ],
                  "violations": [
                    {
                      "_tag": "noChannels"
                    },
                    {
                      "_tag": "noChannels"
                    }
                  ]
                }
              ],
              "duplicates": [
                {
                  "channelId": "channelId",
                  "postId": "postId"
                },
                {
                  "channelId": "channelId",
                  "postId": "postId"
                }
              ],
              "planLimit": {
                "allowed": 1,
                "billingUrl": "billingUrl",
                "limit": "channels",
                "plan": "free",
                "planWithRoom": "starter",
                "used": 1
              },
              "schedule": "ok",
              "unknownChannels": [
                "unknownChannels",
                "unknownChannels"
              ],
              "unknownMedia": [
                "unknownMedia",
                "unknownMedia"
              ],
              "valid": true,
              "violations": [
                {
                  "_tag": "noChannels"
                },
                {
                  "_tag": "noChannels"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/validate")
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

        var response = await Client.Posts.ValidateAsync(
            new PostToValidate
            {
                WorkspaceId = "workspaceId",
                AllowDuplicate = null,
                ChannelIds = new List<string>() { "channelIds", "channelIds" },
                Content = new PostContent
                {
                    Media = new List<MediaAttachment>()
                    {
                        new MediaAttachment { AltText = "altText", MediaId = "mediaId" },
                        new MediaAttachment { AltText = "altText", MediaId = "mediaId" },
                    },
                    Overrides = new List<TextOverride>()
                    {
                        new TextOverride { ChannelId = "channelId", Text = "x" },
                        new TextOverride { ChannelId = "channelId", Text = "x" },
                    },
                    Text = "text",
                },
                Options = null,
                When = null,
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string requestJson = """
            {
              "channelIds": [
                "channelIds"
              ],
              "content": {
                "media": [
                  {
                    "altText": "altText",
                    "mediaId": "mediaId"
                  }
                ],
                "overrides": [
                  {
                    "channelId": "channelId",
                    "text": "text"
                  }
                ],
                "text": "text"
              }
            }
            """;

        const string mockResponse = """
            {
              "channels": [
                {
                  "channelId": "channelId",
                  "hashtags": {
                    "count": 1
                  },
                  "links": {
                    "count": 1
                  },
                  "media": {
                    "count": 1
                  },
                  "mentions": {
                    "count": 1
                  },
                  "platform": "x",
                  "text": "text",
                  "textCounts": [
                    {
                      "length": 1,
                      "maximum": 1,
                      "unit": "graphemes"
                    }
                  ],
                  "violations": [
                    {
                      "_tag": "noChannels"
                    }
                  ]
                }
              ],
              "duplicates": [
                {
                  "channelId": "channelId",
                  "postId": "postId"
                }
              ],
              "planLimit": {
                "allowed": 1,
                "billingUrl": "billingUrl",
                "limit": "channels",
                "plan": "free",
                "planWithRoom": "starter",
                "used": 1
              },
              "schedule": "ok",
              "unknownChannels": [
                "unknownChannels"
              ],
              "unknownMedia": [
                "unknownMedia"
              ],
              "valid": true,
              "violations": [
                {
                  "_tag": "noChannels"
                }
              ]
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/posts/validate")
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

        var response = await Client.Posts.ValidateAsync(
            new PostToValidate
            {
                WorkspaceId = "workspaceId",
                ChannelIds = new List<string>() { "channelIds" },
                Content = new PostContent
                {
                    Media = new List<MediaAttachment>()
                    {
                        new MediaAttachment { AltText = "altText", MediaId = "mediaId" },
                    },
                    Overrides = new List<TextOverride>()
                    {
                        new TextOverride { ChannelId = "channelId", Text = "text" },
                    },
                    Text = "text",
                },
            }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
