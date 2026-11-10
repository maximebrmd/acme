using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(GoogleBusinessPostType.GoogleBusinessPostTypeSerializer))]
[Serializable]
public readonly record struct GoogleBusinessPostType : IStringEnum
{
    public static readonly GoogleBusinessPostType Standard = new(Values.Standard);

    public static readonly GoogleBusinessPostType Event = new(Values.Event);

    public static readonly GoogleBusinessPostType Offer = new(Values.Offer);

    public GoogleBusinessPostType(string value)
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
    public static GoogleBusinessPostType FromCustom(string value)
    {
        return new GoogleBusinessPostType(value);
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

    public static bool operator ==(GoogleBusinessPostType value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(GoogleBusinessPostType value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(GoogleBusinessPostType value) => value.Value;

    public static explicit operator GoogleBusinessPostType(string value) => new(value);

    internal class GoogleBusinessPostTypeSerializer : JsonConverter<GoogleBusinessPostType>
    {
        public override GoogleBusinessPostType Read(
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
            return new GoogleBusinessPostType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            GoogleBusinessPostType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override GoogleBusinessPostType ReadAsPropertyName(
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
            return new GoogleBusinessPostType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            GoogleBusinessPostType value,
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
        public const string Standard = "standard";

        public const string Event = "event";

        public const string Offer = "offer";
    }
}
