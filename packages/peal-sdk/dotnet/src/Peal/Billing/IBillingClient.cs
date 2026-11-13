namespace Peal;

public partial interface IBillingClient
{
    /// <summary>
    /// Answers with the workspace's plan (`free`, `payAsYouGo`, or a plan priced by tiers of channels a subscription still holds), the subscription that buys it, what each limit allows its billing account, how much of it the workspace uses, and the plans it can be on. On a server that does not bill, nothing is limited. Needs billing:read.
    /// </summary>
    WithRawResponseTask<Billing> GetAsync(
        GetBillingRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Answers where the workspace stands against its plan: what it holds beyond it, as on the free tier with more than 2 connected accounts across its billing account after a subscription ended, whether it must come back within it before anything else (more channels or members than the plan allows: nothing is scheduled or published until then, and posts already scheduled fail when due with `planLimit`), until when a grace keeps it publishing (`graceUntil`), the plan that holds everything (`payAsYouGo`, with a payment method), and how many posts wait. Those who manage billing add a payment method, or choose what stays, in the web app. For every member of the workspace.
    /// </summary>
    WithRawResponseTask<Standing> StandingAsync(
        StandingBillingRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
