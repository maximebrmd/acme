using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(DeletionIncompleteEncodedTag.DeletionIncompleteEncodedTagSerializer))]
[Serializable]
public readonly record struct DeletionIncompleteEncodedTag : IStringEnum
{
    public static readonly DeletionIncompleteEncodedTag DeletionIncomplete = new(
        Values.DeletionIncomplete
    );

    public DeletionIncompleteEncodedTag(string value)
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
    public static DeletionIncompleteEncodedTag FromCustom(string value)
    {
        return new DeletionIncompleteEncodedTag(value);
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

    public static bool operator ==(DeletionIncompleteEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(DeletionIncompleteEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(DeletionIncompleteEncodedTag value) => value.Value;

    public static explicit operator DeletionIncompleteEncodedTag(string value) => new(value);

    internal class DeletionIncompleteEncodedTagSerializer
        : JsonConverter<DeletionIncompleteEncodedTag>
    {
        public override DeletionIncompleteEncodedTag Read(
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
            return new DeletionIncompleteEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            DeletionIncompleteEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override DeletionIncompleteEncodedTag ReadAsPropertyName(
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
            return new DeletionIncompleteEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            DeletionIncompleteEncodedTag value,
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
        public const string DeletionIncomplete = "DeletionIncomplete";
    }
}
