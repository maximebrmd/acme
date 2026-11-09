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
}
