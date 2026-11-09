namespace Peal;

/// <summary>
/// Base exception class for all exceptions thrown by the SDK.
/// </summary>
public class PealClientException(string message, Exception? innerException = null)
    : Exception(message, innerException);
