using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(TooManyConnectLinksEncodedTag.TooManyConnectLinksEncodedTagSerializer))]
[Serializable]
public readonly record struct TooManyConnectLinksEncodedTag : IStringEnum
{
    public static readonly TooManyConnectLinksEncodedTag TooManyConnectLinks = new(
        Values.TooManyConnectLinks
    );

    public TooManyConnectLinksEncodedTag(string value)
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
    public static TooManyConnectLinksEncodedTag FromCustom(string value)
    {
        return new TooManyConnectLinksEncodedTag(value);
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

    public static bool operator ==(TooManyConnectLinksEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TooManyConnectLinksEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TooManyConnectLinksEncodedTag value) => value.Value;

    public static explicit operator TooManyConnectLinksEncodedTag(string value) => new(value);

    internal class TooManyConnectLinksEncodedTagSerializer
        : JsonConverter<TooManyConnectLinksEncodedTag>
    {
        public override TooManyConnectLinksEncodedTag Read(
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
            return new TooManyConnectLinksEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TooManyConnectLinksEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TooManyConnectLinksEncodedTag ReadAsPropertyName(
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
            return new TooManyConnectLinksEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TooManyConnectLinksEncodedTag value,
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
        public const string TooManyConnectLinks = "TooManyConnectLinks";
    }
}
