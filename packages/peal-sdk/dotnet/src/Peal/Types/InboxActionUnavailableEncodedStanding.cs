using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(
    typeof(InboxActionUnavailableEncodedStanding.InboxActionUnavailableEncodedStandingSerializer)
)]
[Serializable]
public readonly record struct InboxActionUnavailableEncodedStanding : IStringEnum
{
    public static readonly InboxActionUnavailableEncodedStanding Reconnect = new(Values.Reconnect);

    public static readonly InboxActionUnavailableEncodedStanding Unsupported = new(
        Values.Unsupported
    );

    public InboxActionUnavailableEncodedStanding(string value)
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
    public static InboxActionUnavailableEncodedStanding FromCustom(string value)
    {
        return new InboxActionUnavailableEncodedStanding(value);
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

    public static bool operator ==(InboxActionUnavailableEncodedStanding value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxActionUnavailableEncodedStanding value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxActionUnavailableEncodedStanding value) =>
        value.Value;

    public static explicit operator InboxActionUnavailableEncodedStanding(string value) =>
        new(value);

    internal class InboxActionUnavailableEncodedStandingSerializer
        : JsonConverter<InboxActionUnavailableEncodedStanding>
    {
        public override InboxActionUnavailableEncodedStanding Read(
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
            return new InboxActionUnavailableEncodedStanding(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxActionUnavailableEncodedStanding value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxActionUnavailableEncodedStanding ReadAsPropertyName(
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
            return new InboxActionUnavailableEncodedStanding(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxActionUnavailableEncodedStanding value,
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
        public const string Reconnect = "reconnect";

        public const string Unsupported = "unsupported";
    }
}
