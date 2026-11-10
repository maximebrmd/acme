using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ExternalIdTakenEncodedTag.ExternalIdTakenEncodedTagSerializer))]
[Serializable]
public readonly record struct ExternalIdTakenEncodedTag : IStringEnum
{
    public static readonly ExternalIdTakenEncodedTag ExternalIdTaken = new(Values.ExternalIdTaken);

    public ExternalIdTakenEncodedTag(string value)
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
    public static ExternalIdTakenEncodedTag FromCustom(string value)
    {
        return new ExternalIdTakenEncodedTag(value);
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

    public static bool operator ==(ExternalIdTakenEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ExternalIdTakenEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ExternalIdTakenEncodedTag value) => value.Value;

    public static explicit operator ExternalIdTakenEncodedTag(string value) => new(value);

    internal class ExternalIdTakenEncodedTagSerializer : JsonConverter<ExternalIdTakenEncodedTag>
    {
        public override ExternalIdTakenEncodedTag Read(
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
            return new ExternalIdTakenEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ExternalIdTakenEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ExternalIdTakenEncodedTag ReadAsPropertyName(
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
            return new ExternalIdTakenEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ExternalIdTakenEncodedTag value,
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
        public const string ExternalIdTaken = "ExternalIdTaken";
    }
}
