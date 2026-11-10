using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ConnectLinkStatus.ConnectLinkStatusSerializer))]
[Serializable]
public readonly record struct ConnectLinkStatus : IStringEnum
{
    public static readonly ConnectLinkStatus Pending = new(Values.Pending);

    public static readonly ConnectLinkStatus Completed = new(Values.Completed);

    public static readonly ConnectLinkStatus Revoked = new(Values.Revoked);

    public static readonly ConnectLinkStatus Expired = new(Values.Expired);

    public ConnectLinkStatus(string value)
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
    public static ConnectLinkStatus FromCustom(string value)
    {
        return new ConnectLinkStatus(value);
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

    public static bool operator ==(ConnectLinkStatus value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ConnectLinkStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ConnectLinkStatus value) => value.Value;

    public static explicit operator ConnectLinkStatus(string value) => new(value);

    internal class ConnectLinkStatusSerializer : JsonConverter<ConnectLinkStatus>
    {
        public override ConnectLinkStatus Read(
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
            return new ConnectLinkStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ConnectLinkStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ConnectLinkStatus ReadAsPropertyName(
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
            return new ConnectLinkStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ConnectLinkStatus value,
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
        public const string Pending = "pending";

        public const string Completed = "completed";

        public const string Revoked = "revoked";

        public const string Expired = "expired";
    }
}
