using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ConnectFailureReason.ConnectFailureReasonSerializer))]
[Serializable]
public readonly record struct ConnectFailureReason : IStringEnum
{
    public static readonly ConnectFailureReason PlatformNotSupported = new(
        Values.PlatformNotSupported
    );

    public static readonly ConnectFailureReason NotConfigured = new(Values.NotConfigured);

    public static readonly ConnectFailureReason InvalidInstance = new(Values.InvalidInstance);

    public static readonly ConnectFailureReason InstanceNotAllowed = new(Values.InstanceNotAllowed);

    public static readonly ConnectFailureReason InvalidHandle = new(Values.InvalidHandle);

    public static readonly ConnectFailureReason InvalidState = new(Values.InvalidState);

    public static readonly ConnectFailureReason Denied = new(Values.Denied);

    public static readonly ConnectFailureReason AuthorizationFailed = new(
        Values.AuthorizationFailed
    );

    public static readonly ConnectFailureReason AccountMismatch = new(Values.AccountMismatch);

    public static readonly ConnectFailureReason NoAccounts = new(Values.NoAccounts);

    public ConnectFailureReason(string value)
    {
        Value = value;
    }

    /// <summary>
    /// The string value of the enum.
    /// </summary>
    public string Value { get; }

    /// <summary>
    /// Create a string enum with the given value.
    /// </summary>
    public static ConnectFailureReason FromCustom(string value)
    {
        return new ConnectFailureReason(value);
    }

    public bool Equals(string? other)
    {
        return Value.Equals(other);
    }

    /// <summary>
    /// Returns the string value of the enum.
    /// </summary>
    public override string ToString()
    {
        return Value;
    }

    public static bool operator ==(ConnectFailureReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ConnectFailureReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ConnectFailureReason value) => value.Value;

    public static explicit operator ConnectFailureReason(string value) => new(value);

    internal class ConnectFailureReasonSerializer : JsonConverter<ConnectFailureReason>
    {
        public override ConnectFailureReason Read(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new global::System.Exception(
                    "The JSON value could not be read as a string."
                );
            return new ConnectFailureReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ConnectFailureReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ConnectFailureReason ReadAsPropertyName(
            ref Utf8JsonReader reader,
            Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new global::System.Exception(
                    "The JSON property name could not be read as a string."
                );
            return new ConnectFailureReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ConnectFailureReason value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Value);
        }
    }

    /// <summary>
    /// Constant strings for enum values
    /// </summary>
    [Serializable]
    public static class Values
    {
        public const string PlatformNotSupported = "platformNotSupported";

        public const string NotConfigured = "notConfigured";

        public const string InvalidInstance = "invalidInstance";

        public const string InstanceNotAllowed = "instanceNotAllowed";

        public const string InvalidHandle = "invalidHandle";

        public const string InvalidState = "invalidState";

        public const string Denied = "denied";

        public const string AuthorizationFailed = "authorizationFailed";

        public const string AccountMismatch = "accountMismatch";

        public const string NoAccounts = "noAccounts";
    }
}
