using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ChannelCannotPostEncodedTag.ChannelCannotPostEncodedTagSerializer))]
[Serializable]
public readonly record struct ChannelCannotPostEncodedTag : IStringEnum
{
    public static readonly ChannelCannotPostEncodedTag ChannelCannotPost = new(
        Values.ChannelCannotPost
    );

    public ChannelCannotPostEncodedTag(string value)
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
    public static ChannelCannotPostEncodedTag FromCustom(string value)
    {
        return new ChannelCannotPostEncodedTag(value);
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

    public static bool operator ==(ChannelCannotPostEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ChannelCannotPostEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ChannelCannotPostEncodedTag value) => value.Value;

    public static explicit operator ChannelCannotPostEncodedTag(string value) => new(value);

    internal class ChannelCannotPostEncodedTagSerializer
        : JsonConverter<ChannelCannotPostEncodedTag>
    {
        public override ChannelCannotPostEncodedTag Read(
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
            return new ChannelCannotPostEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ChannelCannotPostEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ChannelCannotPostEncodedTag ReadAsPropertyName(
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
            return new ChannelCannotPostEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ChannelCannotPostEncodedTag value,
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
        public const string ChannelCannotPost = "ChannelCannotPost";
    }
}
