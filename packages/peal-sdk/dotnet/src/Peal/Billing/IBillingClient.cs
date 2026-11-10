namespace Peal;

public partial interface IBillingClient
{
    /// <summary>
    /// Answers with the workspace's plan, the subscription that buys it, what each limit allows, how much of it the workspace uses, and every plan to compare. On a server that does not bill, nothing is limited. Needs billing:read.
    /// </summary>
    WithRawResponseTask<Billing> GetAsync(
        GetBillingRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Answers where the workspace stands against its plan: what it holds beyond it, as after a trial or a cancelled subscription, whether it must come back within it before anything else (more channels or members than the plan allows: nothing is scheduled or published until then, and posts already scheduled fail when due with `planLimit`), the smallest plan that holds everything, and how many posts wait. Those who manage billing order that plan, or choose what stays, in the web app. For every member of the workspace.
    /// </summary>
    WithRawResponseTask<Standing> StandingAsync(
        StandingBillingRequest request,
        RequestOptions? options = null,
        CancellationToken cancellationToken = default
    );
}
