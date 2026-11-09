namespace Peal;

/// <summary>
/// This exception type will be thrown for any non-2XX API responses.
/// </summary>
[Serializable]
public class ServiceUnavailableError(object body, Peal.RawResponse? rawResponse = null)
    : PealClientApiException("ServiceUnavailableError", 503, body, rawResponse: rawResponse);
