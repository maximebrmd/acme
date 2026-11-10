using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(UnknownChannelsEncodedTag.UnknownChannelsEncodedTagSerializer))]
[Serializable]
public readonly record struct UnknownChannelsEncodedTag : IStringEnum
{
    public static readonly UnknownChannelsEncodedTag UnknownChannels = new(Values.UnknownChannels);

    public UnknownChannelsEncodedTag(string value)
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
    public static UnknownChannelsEncodedTag FromCustom(string value)
    {
        return new UnknownChannelsEncodedTag(value);
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

    public static bool operator ==(UnknownChannelsEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(UnknownChannelsEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(UnknownChannelsEncodedTag value) => value.Value;

    public static explicit operator UnknownChannelsEncodedTag(string value) => new(value);

    internal class UnknownChannelsEncodedTagSerializer : JsonConverter<UnknownChannelsEncodedTag>
    {
        public override UnknownChannelsEncodedTag Read(
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
            return new UnknownChannelsEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            UnknownChannelsEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override UnknownChannelsEncodedTag ReadAsPropertyName(
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
            return new UnknownChannelsEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            UnknownChannelsEncodedTag value,
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
        public const string UnknownChannels = "UnknownChannels";
    }
}
