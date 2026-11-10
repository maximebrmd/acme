using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(IdempotencyKeyReusedEncodedTag.IdempotencyKeyReusedEncodedTagSerializer))]
[Serializable]
public readonly record struct IdempotencyKeyReusedEncodedTag : IStringEnum
{
    public static readonly IdempotencyKeyReusedEncodedTag IdempotencyKeyReused = new(
        Values.IdempotencyKeyReused
    );

    public IdempotencyKeyReusedEncodedTag(string value)
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
    public static IdempotencyKeyReusedEncodedTag FromCustom(string value)
    {
        return new IdempotencyKeyReusedEncodedTag(value);
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

    public static bool operator ==(IdempotencyKeyReusedEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(IdempotencyKeyReusedEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(IdempotencyKeyReusedEncodedTag value) => value.Value;

    public static explicit operator IdempotencyKeyReusedEncodedTag(string value) => new(value);

    internal class IdempotencyKeyReusedEncodedTagSerializer
        : JsonConverter<IdempotencyKeyReusedEncodedTag>
    {
        public override IdempotencyKeyReusedEncodedTag Read(
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
            return new IdempotencyKeyReusedEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            IdempotencyKeyReusedEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override IdempotencyKeyReusedEncodedTag ReadAsPropertyName(
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
            return new IdempotencyKeyReusedEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            IdempotencyKeyReusedEncodedTag value,
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
        public const string IdempotencyKeyReused = "IdempotencyKeyReused";
    }
}
