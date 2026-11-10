using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FieldType.FieldTypeSerializer))]
[Serializable]
public readonly record struct FieldType : IStringEnum
{
    public static readonly FieldType Boolean = new(Values.Boolean);

    public static readonly FieldType Choice = new(Values.Choice);

    public static readonly FieldType Integer = new(Values.Integer);

    public static readonly FieldType Text = new(Values.Text);

    public static readonly FieldType TextList = new(Values.TextList);

    public FieldType(string value)
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
    public static FieldType FromCustom(string value)
    {
        return new FieldType(value);
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

    public static bool operator ==(FieldType value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(FieldType value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(FieldType value) => value.Value;

    public static explicit operator FieldType(string value) => new(value);

    internal class FieldTypeSerializer : JsonConverter<FieldType>
    {
        public override FieldType Read(
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
            return new FieldType(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FieldType value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FieldType ReadAsPropertyName(
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
            return new FieldType(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FieldType value,
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
        public const string Boolean = "boolean";

        public const string Choice = "choice";

        public const string Integer = "integer";

        public const string Text = "text";

        public const string TextList = "textList";
    }
}
