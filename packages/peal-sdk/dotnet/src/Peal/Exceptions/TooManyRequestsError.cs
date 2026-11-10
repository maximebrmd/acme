namespace Peal;

/// <summary>
/// This exception type will be thrown for any non-2XX API responses.
/// </summary>
[Serializable]
public class TooManyRequestsError(object body, Peal.RawResponse? rawResponse = null)
    : PealClientApiException("TooManyRequestsError", 429, body, rawResponse: rawResponse);
