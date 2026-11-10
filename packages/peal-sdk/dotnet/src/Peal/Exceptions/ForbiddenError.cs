namespace Peal;

/// <summary>
/// This exception type will be thrown for any non-2XX API responses.
/// </summary>
[Serializable]
public class ForbiddenError(object body, Peal.RawResponse? rawResponse = null)
    : PealClientApiException("ForbiddenError", 403, body, rawResponse: rawResponse);
