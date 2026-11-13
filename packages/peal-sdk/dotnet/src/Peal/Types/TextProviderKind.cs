using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(TextProviderKind.TextProviderKindSerializer))]
[Serializable]
public readonly record struct TextProviderKind : IStringEnum
{
    public static readonly TextProviderKind Anthropic = new(Values.Anthropic);

    public static readonly TextProviderKind OpenaiCompatible = new(Values.OpenaiCompatible);

    public TextProviderKind(string value)
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
    public static TextProviderKind FromCustom(string value)
    {
        return new TextProviderKind(value);
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

    public static bool operator ==(TextProviderKind value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TextProviderKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TextProviderKind value) => value.Value;

    public static explicit operator TextProviderKind(string value) => new(value);

    internal class TextProviderKindSerializer : JsonConverter<TextProviderKind>
    {
        public override TextProviderKind Read(
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
            return new TextProviderKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TextProviderKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TextProviderKind ReadAsPropertyName(
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
            return new TextProviderKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TextProviderKind value,
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
        public const string Anthropic = "anthropic";

        public const string OpenaiCompatible = "openai-compatible";
    }
}
