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
              "awaitsApproval": true,
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
                  "parts": [
                    {
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
                      "part": 1,
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
                      ]
                    },
                    {
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
                      "part": 1,
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
                      ]
                    }
                  ],
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
                  "textNotSent": true,
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
                  "parts": [
                    {
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
                      "part": 1,
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
                      ]
                    },
                    {
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
                      "part": 1,
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
                      ]
                    }
                  ],
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
                  "textNotSent": true,
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
                "allowed": 1000000,
                "billingUrl": "billingUrl",
                "limit": "channels",
                "plan": "free",
                "planWithRoom": "starter",
                "used": 1000000
              },
              "queueNoRoom": "noSlots",
              "queueSlot": "queueSlot",
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
              ],
              "warnings": [
                {
                  "_tag": "channelsDropped",
                  "channelIds": [
                    "channelIds",
                    "channelIds"
                  ],
                  "channelSetId": "channelSetId",
                  "channelSetName": "channelSetName"
                },
                {
                  "_tag": "channelsDropped",
                  "channelIds": [
                    "channelIds",
                    "channelIds"
                  ],
                  "channelSetId": "channelSetId",
                  "channelSetName": "channelSetName"
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
                ChannelSets = null,
                Content = new PostContent
                {
                    FollowUps = null,
                    Media = new List<MediaAttachment>()
                    {
                        new MediaAttachment { AltText = "altText", MediaId = "mediaId" },
                        new MediaAttachment { AltText = "altText", MediaId = "mediaId" },
                    },
                    Overrides = new List<TextOverride>()
                    {
                        new TextOverride
                        {
                            ChannelId = "channelId",
                            Media = null,
                            Text = "x",
                        },
                        new TextOverride
                        {
                            ChannelId = "channelId",
                            Media = null,
                            Text = "x",
                        },
                    },
                    Text = "text",
                },
                DefaultSignatures = null,
                Options = null,
                ShortenLinks = null,
                SignatureId = null,
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
              "awaitsApproval": true,
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
                  "parts": [
                    {
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
                      "part": 1,
                      "text": "text",
                      "textCounts": [
                        {
                          "length": 1,
                          "maximum": 1,
                          "unit": "graphemes"
                        }
                      ]
                    }
                  ],
                  "platform": "x",
                  "text": "text",
                  "textCounts": [
                    {
                      "length": 1,
                      "maximum": 1,
                      "unit": "graphemes"
                    }
                  ],
                  "textNotSent": true,
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
                "allowed": 1000000,
                "billingUrl": "billingUrl",
                "limit": "channels",
                "plan": "free",
                "planWithRoom": "starter",
                "used": 1000000
              },
              "queueNoRoom": "noSlots",
              "queueSlot": "queueSlot",
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
              ],
              "warnings": [
                {
                  "_tag": "channelsDropped",
                  "channelIds": [
                    "channelIds"
                  ],
                  "channelSetId": "channelSetId",
                  "channelSetName": "channelSetName"
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
