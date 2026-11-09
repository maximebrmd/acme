namespace Peal;

/// <summary>
/// This exception type will be thrown for any non-2XX API responses.
/// </summary>
[Serializable]
public class PaymentRequiredError(
    PlanLimitReachedEncoded body,
    Peal.RawResponse? rawResponse = null
) : PealClientApiException("PaymentRequiredError", 402, body, rawResponse: rawResponse)
{
    /// <summary>
    /// The body of the response that triggered the exception.
    /// </summary>
    public new PlanLimitReachedEncoded Body => body;
}
