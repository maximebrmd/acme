using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FacebookFormat.FacebookFormatSerializer))]
[Serializable]
public readonly record struct FacebookFormat : IStringEnum
{
    public static readonly FacebookFormat Feed = new(Values.Feed);

    public static readonly FacebookFormat Story = new(Values.Story);

    public static readonly FacebookFormat Reel = new(Values.Reel);

    public FacebookFormat(string value)
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
    public static FacebookFormat FromCustom(string value)
    {
        return new FacebookFormat(value);
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

    public static bool operator ==(FacebookFormat value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FacebookFormat value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FacebookFormat value) => value.Value;

    public static explicit operator FacebookFormat(string value) => new(value);

    internal class FacebookFormatSerializer : JsonConverter<FacebookFormat>
    {
        public override FacebookFormat Read(
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
            return new FacebookFormat(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FacebookFormat value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FacebookFormat ReadAsPropertyName(
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
            return new FacebookFormat(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FacebookFormat value,
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

        public const string Reel = "reel";
    }
}
