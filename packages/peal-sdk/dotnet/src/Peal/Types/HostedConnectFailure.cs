using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(HostedConnectFailure.HostedConnectFailureSerializer))]
[Serializable]
public readonly record struct HostedConnectFailure : IStringEnum
{
    public static readonly HostedConnectFailure PlatformNotSupported = new(
        Values.PlatformNotSupported
    );

    public static readonly HostedConnectFailure NotConfigured = new(Values.NotConfigured);

    public static readonly HostedConnectFailure InvalidInstance = new(Values.InvalidInstance);

    public static readonly HostedConnectFailure InstanceNotAllowed = new(Values.InstanceNotAllowed);

    public static readonly HostedConnectFailure InvalidHandle = new(Values.InvalidHandle);

    public static readonly HostedConnectFailure InvalidState = new(Values.InvalidState);

    public static readonly HostedConnectFailure Denied = new(Values.Denied);

    public static readonly HostedConnectFailure AuthorizationFailed = new(
        Values.AuthorizationFailed
    );

    public static readonly HostedConnectFailure AccountMismatch = new(Values.AccountMismatch);

    public static readonly HostedConnectFailure NoAccounts = new(Values.NoAccounts);

    public static readonly HostedConnectFailure LinkExpired = new(Values.LinkExpired);

    public static readonly HostedConnectFailure LinkCompleted = new(Values.LinkCompleted);

    public static readonly HostedConnectFailure LinkRevoked = new(Values.LinkRevoked);

    public static readonly HostedConnectFailure TooManyAttempts = new(Values.TooManyAttempts);

    public static readonly HostedConnectFailure PlanLimit = new(Values.PlanLimit);

    public static readonly HostedConnectFailure ChannelGone = new(Values.ChannelGone);

    public static readonly HostedConnectFailure PlatformUnreachable = new(
        Values.PlatformUnreachable
    );

    public static readonly HostedConnectFailure PlatformNotOffered = new(Values.PlatformNotOffered);

    public HostedConnectFailure(string value)
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
    public static HostedConnectFailure FromCustom(string value)
    {
        return new HostedConnectFailure(value);
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

    public static bool operator ==(HostedConnectFailure value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(HostedConnectFailure value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(HostedConnectFailure value) => value.Value;

    public static explicit operator HostedConnectFailure(string value) => new(value);

    internal class HostedConnectFailureSerializer : JsonConverter<HostedConnectFailure>
    {
        public override HostedConnectFailure Read(
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
            return new HostedConnectFailure(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            HostedConnectFailure value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override HostedConnectFailure ReadAsPropertyName(
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
            return new HostedConnectFailure(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            HostedConnectFailure value,
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

        public const string LinkExpired = "linkExpired";

        public const string LinkCompleted = "linkCompleted";

        public const string LinkRevoked = "linkRevoked";

        public const string TooManyAttempts = "tooManyAttempts";

        public const string PlanLimit = "planLimit";

        public const string ChannelGone = "channelGone";

        public const string PlatformUnreachable = "platformUnreachable";

        public const string PlatformNotOffered = "platformNotOffered";
    }
}
