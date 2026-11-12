using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(TooManyFeedsEncodedTag.TooManyFeedsEncodedTagSerializer))]
[Serializable]
public readonly record struct TooManyFeedsEncodedTag : IStringEnum
{
    public static readonly TooManyFeedsEncodedTag TooManyFeeds = new(Values.TooManyFeeds);

    public TooManyFeedsEncodedTag(string value)
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
    public static TooManyFeedsEncodedTag FromCustom(string value)
    {
        return new TooManyFeedsEncodedTag(value);
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

    public static bool operator ==(TooManyFeedsEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TooManyFeedsEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TooManyFeedsEncodedTag value) => value.Value;

    public static explicit operator TooManyFeedsEncodedTag(string value) => new(value);

    internal class TooManyFeedsEncodedTagSerializer : JsonConverter<TooManyFeedsEncodedTag>
    {
        public override TooManyFeedsEncodedTag Read(
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
            return new TooManyFeedsEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TooManyFeedsEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TooManyFeedsEncodedTag ReadAsPropertyName(
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
            return new TooManyFeedsEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TooManyFeedsEncodedTag value,
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
        public const string TooManyFeeds = "TooManyFeeds";
    }
}
