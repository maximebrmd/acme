using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AccountUnreadReason.AccountUnreadReasonSerializer))]
[Serializable]
public readonly record struct AccountUnreadReason : IStringEnum
{
    public static readonly AccountUnreadReason Disabled = new(Values.Disabled);

    public static readonly AccountUnreadReason Disconnected = new(Values.Disconnected);

    public static readonly AccountUnreadReason PlatformUnreachable = new(
        Values.PlatformUnreachable
    );

    public static readonly AccountUnreadReason RateLimited = new(Values.RateLimited);

    public static readonly AccountUnreadReason Reconnect = new(Values.Reconnect);

    public AccountUnreadReason(string value)
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
    public static AccountUnreadReason FromCustom(string value)
    {
        return new AccountUnreadReason(value);
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

    public static bool operator ==(AccountUnreadReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AccountUnreadReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AccountUnreadReason value) => value.Value;

    public static explicit operator AccountUnreadReason(string value) => new(value);

    internal class AccountUnreadReasonSerializer : JsonConverter<AccountUnreadReason>
    {
        public override AccountUnreadReason Read(
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
            return new AccountUnreadReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AccountUnreadReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AccountUnreadReason ReadAsPropertyName(
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
            return new AccountUnreadReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AccountUnreadReason value,
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
        public const string Disabled = "disabled";

        public const string Disconnected = "disconnected";

        public const string PlatformUnreachable = "platformUnreachable";

        public const string RateLimited = "rateLimited";

        public const string Reconnect = "reconnect";
    }
}
