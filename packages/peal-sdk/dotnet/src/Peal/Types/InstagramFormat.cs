using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(InstagramFormat.InstagramFormatSerializer))]
[Serializable]
public readonly record struct InstagramFormat : IStringEnum
{
    public static readonly InstagramFormat Feed = new(Values.Feed);

    public static readonly InstagramFormat Story = new(Values.Story);

    public InstagramFormat(string value)
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
    public static InstagramFormat FromCustom(string value)
    {
        return new InstagramFormat(value);
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

    public static bool operator ==(InstagramFormat value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InstagramFormat value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InstagramFormat value) => value.Value;

    public static explicit operator InstagramFormat(string value) => new(value);

    internal class InstagramFormatSerializer : JsonConverter<InstagramFormat>
    {
        public override InstagramFormat Read(
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
            return new InstagramFormat(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InstagramFormat value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InstagramFormat ReadAsPropertyName(
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
            return new InstagramFormat(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InstagramFormat value,
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
        public const string Feed = "feed";

        public const string Story = "story";
    }
}
