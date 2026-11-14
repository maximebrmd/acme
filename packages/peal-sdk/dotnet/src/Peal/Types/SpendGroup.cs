using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(SpendGroup.SpendGroupSerializer))]
[Serializable]
public readonly record struct SpendGroup : IStringEnum
{
    public static readonly SpendGroup Assistant = new(Values.Assistant);

    public static readonly SpendGroup X = new(Values.X);

    public SpendGroup(string value)
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
    public static SpendGroup FromCustom(string value)
    {
        return new SpendGroup(value);
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

    public static bool operator ==(SpendGroup value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(SpendGroup value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(SpendGroup value) => value.Value;

    public static explicit operator SpendGroup(string value) => new(value);

    internal class SpendGroupSerializer : JsonConverter<SpendGroup>
    {
        public override SpendGroup Read(
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
            return new SpendGroup(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            SpendGroup value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override SpendGroup ReadAsPropertyName(
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
            return new SpendGroup(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            SpendGroup value,
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
        public const string Assistant = "assistant";

        public const string X = "x";
    }
}
