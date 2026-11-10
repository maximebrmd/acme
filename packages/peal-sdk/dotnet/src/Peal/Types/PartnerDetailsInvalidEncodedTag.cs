using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PartnerDetailsInvalidEncodedTag.PartnerDetailsInvalidEncodedTagSerializer))]
[Serializable]
public readonly record struct PartnerDetailsInvalidEncodedTag : IStringEnum
{
    public static readonly PartnerDetailsInvalidEncodedTag PartnerDetailsInvalid = new(
        Values.PartnerDetailsInvalid
    );

    public PartnerDetailsInvalidEncodedTag(string value)
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
    public static PartnerDetailsInvalidEncodedTag FromCustom(string value)
    {
        return new PartnerDetailsInvalidEncodedTag(value);
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

    public static bool operator ==(PartnerDetailsInvalidEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(PartnerDetailsInvalidEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(PartnerDetailsInvalidEncodedTag value) => value.Value;

    public static explicit operator PartnerDetailsInvalidEncodedTag(string value) => new(value);

    internal class PartnerDetailsInvalidEncodedTagSerializer
        : JsonConverter<PartnerDetailsInvalidEncodedTag>
    {
        public override PartnerDetailsInvalidEncodedTag Read(
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
            return new PartnerDetailsInvalidEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PartnerDetailsInvalidEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PartnerDetailsInvalidEncodedTag ReadAsPropertyName(
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
            return new PartnerDetailsInvalidEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PartnerDetailsInvalidEncodedTag value,
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
        public const string PartnerDetailsInvalid = "PartnerDetailsInvalid";
    }
}
