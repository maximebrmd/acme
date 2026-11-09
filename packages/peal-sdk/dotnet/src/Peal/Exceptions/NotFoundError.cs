namespace Peal;

/// <summary>
/// This exception type will be thrown for any non-2XX API responses.
/// </summary>
[Serializable]
public class NotFoundError(object body, Peal.RawResponse? rawResponse = null)
    : PealClientApiException("NotFoundError", 404, body, rawResponse: rawResponse);
