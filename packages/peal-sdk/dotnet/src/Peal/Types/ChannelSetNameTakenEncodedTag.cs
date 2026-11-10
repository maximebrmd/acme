using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ChannelSetNameTakenEncodedTag.ChannelSetNameTakenEncodedTagSerializer))]
[Serializable]
public readonly record struct ChannelSetNameTakenEncodedTag : IStringEnum
{
    public static readonly ChannelSetNameTakenEncodedTag ChannelSetNameTaken = new(
        Values.ChannelSetNameTaken
    );

    public ChannelSetNameTakenEncodedTag(string value)
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
    public static ChannelSetNameTakenEncodedTag FromCustom(string value)
    {
        return new ChannelSetNameTakenEncodedTag(value);
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

    public static bool operator ==(ChannelSetNameTakenEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ChannelSetNameTakenEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ChannelSetNameTakenEncodedTag value) => value.Value;

    public static explicit operator ChannelSetNameTakenEncodedTag(string value) => new(value);

    internal class ChannelSetNameTakenEncodedTagSerializer
        : JsonConverter<ChannelSetNameTakenEncodedTag>
    {
        public override ChannelSetNameTakenEncodedTag Read(
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
            return new ChannelSetNameTakenEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ChannelSetNameTakenEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ChannelSetNameTakenEncodedTag ReadAsPropertyName(
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
            return new ChannelSetNameTakenEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ChannelSetNameTakenEncodedTag value,
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
        public const string ChannelSetNameTaken = "ChannelSetNameTaken";
    }
}
