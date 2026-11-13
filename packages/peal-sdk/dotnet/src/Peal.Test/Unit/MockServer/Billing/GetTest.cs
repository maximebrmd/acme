using NUnit.Framework;
using Peal;
using Peal.Test.Unit.MockServer;
using Peal.Test.Utils;

namespace Peal.Test.Unit.MockServer.Billing;

[TestFixture]
[Parallelizable(ParallelScope.Self)]
public class GetTest : BaseMockServerTest
{
    [NUnit.Framework.Test]
    public async Task MockServerTest_1()
    {
        const string mockResponse = """
            {
              "account": {
                "billingWorkspaceId": "billingWorkspaceId",
                "billingWorkspaceName": "billingWorkspaceName",
                "id": "id",
                "otherWorkspaces": [
                  {
                    "name": "name",
                    "workspaceId": "workspaceId"
                  },
                  {
                    "name": "name",
                    "workspaceId": "workspaceId"
                  }
                ],
                "partner": true,
                "payer": true,
                "transfer": {
                  "expiresAt": "expiresAt",
                  "offeredAt": "offeredAt",
                  "offeredBy": "offeredBy",
                  "toUserId": "toUserId"
                },
                "workspaces": 1
              },
              "accounts": {
                "accountDays": 1000000,
                "connected": 1,
                "estimate": {
                  "amount": 1,
                  "currency": "currency"
                },
                "nextAccount": {
                  "amount": 1,
                  "currency": "currency"
                },
                "pooled": 1
              },
              "allowances": {
                "assistantRequests": 1000000,
                "channels": 1000000,
                "mediaStorage": 1000000,
                "members": 1000000,
                "scheduledPosts": 1000000
              },
              "currency": "currency",
              "enabled": true,
              "estimate": {
                "amount": 1,
                "currency": "currency"
              },
              "paymentFailed": true,
              "paymentMethod": true,
              "plan": "free",
              "plans": [
                {
                  "allowances": {
                    "assistantRequests": 1000000,
                    "channels": 1000000,
                    "mediaStorage": 1000000,
                    "members": 1000000,
                    "scheduledPosts": 1000000
                  },
                  "plan": "free",
                  "price": {
                    "month": 1,
                    "year": 1
                  }
                },
                {
                  "allowances": {
                    "assistantRequests": 1000000,
                    "channels": 1000000,
                    "mediaStorage": 1000000,
                    "members": 1000000,
                    "scheduledPosts": 1000000
                  },
                  "plan": "free",
                  "price": {
                    "month": 1,
                    "year": 1
                  }
                }
              ],
              "rateCard": {
                "apiRequestsPerMinute": {
                  "onRequest": 1,
                  "withoutPaymentMethod": 1
                },
                "assistant": {
                  "margin": 1
                },
                "daysPerMonth": 1,
                "displayVatRate": 1,
                "meters": {
                  "assistantImages": {
                    "allowance": 1,
                    "allowanceWithout": 1,
                    "ceiling": 1
                  },
                  "assistantRequests": {
                    "allowance": 1,
                    "allowanceWithout": 1,
                    "ceiling": 1
                  },
                  "managedAds": {
                    "allowance": 1,
                    "allowanceWithout": 1,
                    "ceiling": 1
                  },
                  "outboundMessages": {
                    "allowance": 1,
                    "allowanceWithout": 1,
                    "ceiling": 1
                  },
                  "xApi": {
                    "allowance": 1,
                    "allowanceWithout": 1,
                    "ceiling": 1
                  }
                },
                "prices": {
                  "usd": {
                    "accounts": {
                      "bands": [
                        {
                          "monthly": 1,
                          "upTo": 1
                        },
                        {
                          "monthly": 1,
                          "upTo": 1
                        }
                      ]
                    },
                    "meters": {
                      "assistantImages": {
                        "cents": 1,
                        "per": 1
                      },
                      "assistantRequests": {
                        "cents": 1,
                        "per": 1
                      },
                      "managedAds": {
                        "cents": 1,
                        "per": 1
                      },
                      "outboundMessages": {
                        "cents": 1,
                        "per": 1
                      },
                      "xApi": {
                        "cents": 1,
                        "per": 1
                      }
                    }
                  }
                },
                "storage": {
                  "minimum": 1000000,
                  "perAccount": 1000000,
                  "withoutPaymentMethod": 1000000
                },
                "unverifiedCeiling": 1,
                "x": {
                  "defaultCeiling": 1,
                  "rates": {
                    "dmCreate": 1,
                    "dmEventRead": 1,
                    "ownedRead": 1,
                    "postCreate": 1,
                    "postCreateWithUrl": 1,
                    "postRead": 1,
                    "userRead": 1
                  }
                }
              },
              "subscription": {
                "cancelAtPeriodEnd": true,
                "currentPeriodEnd": "currentPeriodEnd",
                "endsAt": "endsAt",
                "interval": "month",
                "plan": "starter",
                "startedAt": "startedAt",
                "status": "incomplete",
                "trialEnd": "trialEnd"
              },
              "trial": {
                "available": true,
                "days": 1,
                "plan": "starter"
              },
              "upcomingInvoice": {
                "amount": 1,
                "currency": "currency"
              },
              "usage": {
                "assistantRequests": {
                  "resetsAt": "resetsAt",
                  "used": 1
                },
                "channels": 1,
                "mediaStorage": 1000000,
                "members": 1,
                "scheduledPosts": {
                  "resetsAt": "resetsAt",
                  "used": 1
                }
              },
              "vatRate": 1,
              "withdrawableUntil": "withdrawableUntil"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/billing")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Billing.GetAsync(
            new GetBillingRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }

    [NUnit.Framework.Test]
    public async Task MockServerTest_2()
    {
        const string mockResponse = """
            {
              "account": {
                "billingWorkspaceId": "billingWorkspaceId",
                "billingWorkspaceName": "billingWorkspaceName",
                "id": "id",
                "otherWorkspaces": [
                  {
                    "name": "name",
                    "workspaceId": "workspaceId"
                  }
                ],
                "partner": true,
                "payer": true,
                "transfer": {
                  "expiresAt": "expiresAt",
                  "offeredAt": "offeredAt",
                  "offeredBy": "offeredBy",
                  "toUserId": "toUserId"
                },
                "workspaces": 1
              },
              "accounts": {
                "accountDays": 1000000,
                "connected": 1,
                "estimate": {
                  "amount": 1,
                  "currency": "currency"
                },
                "nextAccount": {
                  "amount": 1,
                  "currency": "currency"
                },
                "pooled": 1
              },
              "allowances": {
                "assistantRequests": 1000000,
                "channels": 1000000,
                "mediaStorage": 1000000,
                "members": 1000000,
                "scheduledPosts": 1000000
              },
              "currency": "currency",
              "enabled": true,
              "estimate": {
                "amount": 1,
                "currency": "currency"
              },
              "paymentFailed": true,
              "paymentMethod": true,
              "plan": "free",
              "plans": [
                {
                  "allowances": {},
                  "plan": "free",
                  "price": {
                    "month": 1,
                    "year": 1
                  }
                }
              ],
              "rateCard": {
                "apiRequestsPerMinute": {
                  "onRequest": 1,
                  "withoutPaymentMethod": 1
                },
                "assistant": {
                  "margin": 1
                },
                "daysPerMonth": 1,
                "displayVatRate": 1,
                "meters": {
                  "assistantImages": {
                    "allowance": 1,
                    "allowanceWithout": 1
                  },
                  "assistantRequests": {
                    "allowance": 1,
                    "allowanceWithout": 1
                  },
                  "managedAds": {
                    "allowance": 1,
                    "allowanceWithout": 1
                  },
                  "outboundMessages": {
                    "allowance": 1,
                    "allowanceWithout": 1
                  },
                  "xApi": {
                    "allowance": 1,
                    "allowanceWithout": 1
                  }
                },
                "prices": {
                  "usd": {
                    "accounts": {
                      "bands": [
                        {
                          "monthly": 1
                        }
                      ]
                    },
                    "meters": {
                      "assistantImages": {
                        "cents": 1,
                        "per": 1
                      },
                      "assistantRequests": {
                        "cents": 1,
                        "per": 1
                      },
                      "managedAds": {
                        "cents": 1,
                        "per": 1
                      },
                      "outboundMessages": {
                        "cents": 1,
                        "per": 1
                      },
                      "xApi": {
                        "cents": 1,
                        "per": 1
                      }
                    }
                  }
                },
                "storage": {
                  "minimum": 1000000,
                  "perAccount": 1000000,
                  "withoutPaymentMethod": 1000000
                },
                "unverifiedCeiling": 1,
                "x": {
                  "defaultCeiling": 1,
                  "rates": {
                    "dmCreate": 1,
                    "dmEventRead": 1,
                    "ownedRead": 1,
                    "postCreate": 1,
                    "postCreateWithUrl": 1,
                    "postRead": 1,
                    "userRead": 1
                  }
                }
              },
              "subscription": {
                "cancelAtPeriodEnd": true,
                "currentPeriodEnd": "currentPeriodEnd",
                "endsAt": "endsAt",
                "interval": "month",
                "plan": "starter",
                "startedAt": "startedAt",
                "status": "incomplete",
                "trialEnd": "trialEnd"
              },
              "trial": {
                "available": true,
                "days": 1,
                "plan": "starter"
              },
              "upcomingInvoice": {
                "amount": 1,
                "currency": "currency"
              },
              "usage": {
                "assistantRequests": {
                  "resetsAt": "resetsAt",
                  "used": 1
                },
                "channels": 1,
                "mediaStorage": 1000000,
                "members": 1,
                "scheduledPosts": {
                  "resetsAt": "resetsAt",
                  "used": 1
                }
              },
              "vatRate": 1,
              "withdrawableUntil": "withdrawableUntil"
            }
            """;

        Server
            .Given(
                WireMock
                    .RequestBuilders.Request.Create()
                    .WithPath("/api/workspaces/workspaceId/billing")
                    .UsingGet()
            )
            .RespondWith(
                WireMock
                    .ResponseBuilders.Response.Create()
                    .WithStatusCode(200)
                    .WithBody(mockResponse)
            );

        var response = await Client.Billing.GetAsync(
            new GetBillingRequest { WorkspaceId = "workspaceId" }
        );
        JsonAssert.AreEqual(response, mockResponse);
    }
}
