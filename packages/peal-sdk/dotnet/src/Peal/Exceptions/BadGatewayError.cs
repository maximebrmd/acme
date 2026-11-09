namespace Peal;

/// <summary>
/// This exception type will be thrown for any non-2XX API responses.
/// </summary>
[Serializable]
public class BadGatewayError(object body, Peal.RawResponse? rawResponse = null)
    : PealClientApiException("BadGatewayError", 502, body, rawResponse: rawResponse);
