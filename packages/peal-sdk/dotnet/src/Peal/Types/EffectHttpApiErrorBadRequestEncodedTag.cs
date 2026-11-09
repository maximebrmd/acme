using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(
    typeof(EffectHttpApiErrorBadRequestEncodedTag.EffectHttpApiErrorBadRequestEncodedTagSerializer)
)]
[Serializable]
public readonly record struct EffectHttpApiErrorBadRequestEncodedTag : IStringEnum
{
    public static readonly EffectHttpApiErrorBadRequestEncodedTag BadRequest = new(
        Values.BadRequest
    );

    public EffectHttpApiErrorBadRequestEncodedTag(string value)
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
    public static EffectHttpApiErrorBadRequestEncodedTag FromCustom(string value)
    {
        return new EffectHttpApiErrorBadRequestEncodedTag(value);
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

    public static bool operator ==(EffectHttpApiErrorBadRequestEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(EffectHttpApiErrorBadRequestEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(EffectHttpApiErrorBadRequestEncodedTag value) =>
        value.Value;

    public static explicit operator EffectHttpApiErrorBadRequestEncodedTag(string value) =>
        new(value);

    internal class EffectHttpApiErrorBadRequestEncodedTagSerializer
        : JsonConverter<EffectHttpApiErrorBadRequestEncodedTag>
    {
        public override EffectHttpApiErrorBadRequestEncodedTag Read(
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
            return new EffectHttpApiErrorBadRequestEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            EffectHttpApiErrorBadRequestEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override EffectHttpApiErrorBadRequestEncodedTag ReadAsPropertyName(
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
            return new EffectHttpApiErrorBadRequestEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            EffectHttpApiErrorBadRequestEncodedTag value,
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
        public const string BadRequest = "BadRequest";
    }
}
