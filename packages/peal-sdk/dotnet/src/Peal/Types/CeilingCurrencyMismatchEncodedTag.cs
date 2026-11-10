using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(
    typeof(CeilingCurrencyMismatchEncodedTag.CeilingCurrencyMismatchEncodedTagSerializer)
)]
[Serializable]
public readonly record struct CeilingCurrencyMismatchEncodedTag : IStringEnum
{
    public static readonly CeilingCurrencyMismatchEncodedTag CeilingCurrencyMismatch = new(
        Values.CeilingCurrencyMismatch
    );

    public CeilingCurrencyMismatchEncodedTag(string value)
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
    public static CeilingCurrencyMismatchEncodedTag FromCustom(string value)
    {
        return new CeilingCurrencyMismatchEncodedTag(value);
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

    public static bool operator ==(CeilingCurrencyMismatchEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(CeilingCurrencyMismatchEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(CeilingCurrencyMismatchEncodedTag value) => value.Value;

    public static explicit operator CeilingCurrencyMismatchEncodedTag(string value) => new(value);

    internal class CeilingCurrencyMismatchEncodedTagSerializer
        : JsonConverter<CeilingCurrencyMismatchEncodedTag>
    {
        public override CeilingCurrencyMismatchEncodedTag Read(
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
            return new CeilingCurrencyMismatchEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            CeilingCurrencyMismatchEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override CeilingCurrencyMismatchEncodedTag ReadAsPropertyName(
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
            return new CeilingCurrencyMismatchEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            CeilingCurrencyMismatchEncodedTag value,
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
        public const string CeilingCurrencyMismatch = "CeilingCurrencyMismatch";
    }
}
