using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Capabilities;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class ChannelTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "account": {
                "_tag": "unrestricted"
              },
              "capabilities": {
                "analytics": {
                  "accountNumbers": [
                    "followers",
                    "followers"
                  ],
                  "perPost": true,
                  "postCounts": [
                    "likes",
                    "likes"
                  ]
                },
                "followUps": {
                  "commentNeeds": "pageAdministrator",
                  "commentTextLimits": [
                    {
                      "maximum": 1,
                      "unit": "graphemes"
                    },
                    {
                      "maximum": 1,
                      "unit": "graphemes"
                    }
                  ],
                  "kind": "thread",
                  "maxCount": 1
                },
                "livePost": {
                  "edit": true,
                  "editBlockedBy": "noApi",
                  "unpublish": true,
                  "unpublishBlockedBy": "noApi"
                },
                "lookups": [
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
                ],
                "media": {
                  "altText": {
                    "maxLength": 1,
                    "shown": true
                  },
                  "formats": [
                    {
                      "contentType": "image/gif",
                      "kind": "image",
                      "maxAspectRatio": 1.1,
                      "maxByteSize": 1000000,
                      "maxDurationMs": 1,
                      "maxMediaWith": 1,
                      "maxPixels": 1,
                      "maxSide": 1,
                      "minAspectRatio": 1.1,
                      "minByteSize": 1000000,
                      "minDurationMs": 1,
                      "minSide": 1
                    },
                    {
                      "contentType": "image/gif",
                      "kind": "image",
                      "maxAspectRatio": 1.1,
                      "maxByteSize": 1000000,
                      "maxDurationMs": 1,
                      "maxMediaWith": 1,
                      "maxPixels": 1,
                      "maxSide": 1,
                      "minAspectRatio": 1.1,
                      "minByteSize": 1000000,
                      "minDurationMs": 1,
                      "minSide": 1
                    }
                  ],
                  "maxCount": 1,
                  "maxVideos": 1,
                  "mixesKinds": true,
                  "required": true
                },
                "options": {
                  "constraints": [
                    {
                      "_tag": "needsOneOf",
                      "field": "field",
                      "oneOf": [
                        "oneOf",
                        "oneOf"
                      ]
                    },
                    {
                      "_tag": "needsOneOf",
                      "field": "field",
                      "oneOf": [
                        "oneOf",
                        "oneOf"
                      ]
                    }
                  ],
                  "fields": [
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
                  ]
                },
                "platform": "x",
                "poll": {
                  "choiceLimit": {
                    "maximum": 1,
                    "unit": "graphemes"
                  },
                  "durationMinutes": {
                    "maximum": 1,
                    "minimum": 1
                  },
                  "maxChoices": 1,
                  "minChoices": 1,
                  "multipleChoice": true
                },
                "postFormats": [
                  {
                    "description": "description",
                    "media": {
                      "altText": {
                        "maxLength": 1,
                        "shown": true
                      },
                      "formats": [
                        {
                          "contentType": "image/gif",
                          "kind": "image",
                          "maxAspectRatio": 1.1,
                          "maxByteSize": 1000000,
                          "maxDurationMs": 1,
                          "maxMediaWith": 1,
                          "maxPixels": 1,
                          "maxSide": 1,
                          "minAspectRatio": 1.1,
                          "minByteSize": 1000000,
                          "minDurationMs": 1,
                          "minSide": 1
                        },
                        {
                          "contentType": "image/gif",
                          "kind": "image",
                          "maxAspectRatio": 1.1,
                          "maxByteSize": 1000000,
                          "maxDurationMs": 1,
                          "maxMediaWith": 1,
                          "maxPixels": 1,
                          "maxSide": 1,
                          "minAspectRatio": 1.1,
                          "minByteSize": 1000000,
                          "minDurationMs": 1,
                          "minSide": 1
                        }
                      ],
                      "maxCount": 1,
                      "maxVideos": 1,
                      "mixesKinds": true,
                      "required": true
                    },
                    "name": "name",
                    "sendsText": true
                  },
                  {
                    "description": "description",
                    "media": {
                      "altText": {
                        "maxLength": 1,
                        "shown": true
                      },
                      "formats": [
                        {
                          "contentType": "image/gif",
                          "kind": "image",
                          "maxAspectRatio": 1.1,
                          "maxByteSize": 1000000,
                          "maxDurationMs": 1,
                          "maxMediaWith": 1,
                          "maxPixels": 1,
                          "maxSide": 1,
                          "minAspectRatio": 1.1,
                          "minByteSize": 1000000,
                          "minDurationMs": 1,
                          "minSide": 1
                        },
                        {
                          "contentType": "image/gif",
                          "kind": "image",
                          "maxAspectRatio": 1.1,
                          "maxByteSize": 1000000,
                          "maxDurationMs": 1,
                          "maxMediaWith": 1,
                          "maxPixels": 1,
                          "maxSide": 1,
                          "minAspectRatio": 1.1,
                          "minByteSize": 1000000,
                          "minDurationMs": 1,
                          "minSide": 1
                        }
                      ],
                      "maxCount": 1,
                      "maxVideos": 1,
                      "mixesKinds": true,
                      "required": true
                    },
                    "name": "name",
                    "sendsText": true
                  }
                ],
                "text": {
                  "forbiddenCharacters": [
                    "forbiddenCharacters",
                    "forbiddenCharacters"
                  ],
                  "limits": [
                    {
                      "maximum": 1,
                      "unit": "graphemes"
                    },
                    {
                      "maximum": 1,
                      "unit": "graphemes"
                    }
                  ],
                  "maxHashtags": 1,
                  "maxLinks": 1,
                  "maxMentions": 1
                },
                "version": 1
              },
              "channelId": "channelId"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId/capabilities")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Capabilities.ChannelAsync(
            new ChannelCapabilitiesRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "account": {
                "_tag": "unrestricted"
              },
              "capabilities": {
                "analytics": {
                  "accountNumbers": [
                    "followers"
                  ],
                  "perPost": true,
                  "postCounts": [
                    "likes"
                  ]
                },
                "followUps": {
                  "commentNeeds": "pageAdministrator",
                  "commentTextLimits": [
                    {
                      "maximum": 1,
                      "unit": "graphemes"
                    }
                  ],
                  "kind": "thread",
                  "maxCount": 1
                },
                "livePost": {
                  "edit": true,
                  "editBlockedBy": "noApi",
                  "unpublish": true,
                  "unpublishBlockedBy": "noApi"
                },
                "lookups": [
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
                ],
                "media": {
                  "altText": {
                    "maxLength": 1
                  },
                  "formats": [
                    {
                      "contentType": "image/gif",
                      "kind": "image"
                    }
                  ],
                  "maxCount": 1,
                  "maxVideos": 1,
                  "mixesKinds": true,
                  "required": true
                },
                "options": {
                  "constraints": [
                    {
                      "_tag": "needsOneOf",
                      "field": "field",
                      "oneOf": [
                        "oneOf"
                      ]
                    }
                  ],
                  "fields": [
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
                  ]
                },
                "platform": "x",
                "poll": {
                  "choiceLimit": {
                    "maximum": 1,
                    "unit": "graphemes"
                  },
                  "durationMinutes": {
                    "maximum": 1,
                    "minimum": 1
                  },
                  "maxChoices": 1,
                  "minChoices": 1,
                  "multipleChoice": true
                },
                "postFormats": [
                  {
                    "description": "description",
                    "media": {
                      "altText": {
                        "maxLength": 1
                      },
                      "maxCount": 1,
                      "required": true
                    },
                    "name": "name",
                    "sendsText": true
                  }
                ],
                "text": {
                  "forbiddenCharacters": [
                    "forbiddenCharacters"
                  ],
                  "limits": [
                    {
                      "maximum": 1,
                      "unit": "graphemes"
                    }
                  ],
                  "maxHashtags": 1,
                  "maxLinks": 1,
                  "maxMentions": 1
                },
                "version": 1
              },
              "channelId": "channelId"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/channels/channelId/capabilities")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Capabilities.ChannelAsync(
            new ChannelCapabilitiesRequest { WorkspaceId = "workspaceId", ChannelId = "channelId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
