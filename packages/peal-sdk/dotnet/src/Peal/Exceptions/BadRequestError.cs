namespace Peal;

/// <summary>
/// This exception type will be thrown for any non-2XX API responses.
/// </summary>
[Serializable]
public class BadRequestError(object body, Peal.RawResponse? rawResponse = null)
    : PealClientApiException("BadRequestError", 400, body, rawResponse: rawResponse);
