namespace Peal;

/// <summary>
/// This exception type will be thrown for any non-2XX API responses.
/// </summary>
[Serializable]
public class PaymentRequiredError(object body, Peal.RawResponse? rawResponse = null)
    : PealClientApiException("PaymentRequiredError", 402, body, rawResponse: rawResponse);
