using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ChannelCannotPostEncodedReason.ChannelCannotPostEncodedReasonSerializer))]
[Serializable]
public readonly record struct ChannelCannotPostEncodedReason : IStringEnum
{
    public static readonly ChannelCannotPostEncodedReason Disabled = new(Values.Disabled);

    public static readonly ChannelCannotPostEncodedReason Reconnect = new(Values.Reconnect);

    public ChannelCannotPostEncodedReason(string value)
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
    public static ChannelCannotPostEncodedReason FromCustom(string value)
    {
        return new ChannelCannotPostEncodedReason(value);
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

    public static bool operator ==(ChannelCannotPostEncodedReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ChannelCannotPostEncodedReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ChannelCannotPostEncodedReason value) => value.Value;

    public static explicit operator ChannelCannotPostEncodedReason(string value) => new(value);

    internal class ChannelCannotPostEncodedReasonSerializer
        : JsonConverter<ChannelCannotPostEncodedReason>
    {
        public override ChannelCannotPostEncodedReason Read(
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
            return new ChannelCannotPostEncodedReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ChannelCannotPostEncodedReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ChannelCannotPostEncodedReason ReadAsPropertyName(
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
            return new ChannelCannotPostEncodedReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ChannelCannotPostEncodedReason value,
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

        public const string Reconnect = "reconnect";
    }
}
