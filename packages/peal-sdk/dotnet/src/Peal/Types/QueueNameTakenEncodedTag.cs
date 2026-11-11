using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(QueueNameTakenEncodedTag.QueueNameTakenEncodedTagSerializer))]
[Serializable]
public readonly record struct QueueNameTakenEncodedTag : IStringEnum
{
    public static readonly QueueNameTakenEncodedTag QueueNameTaken = new(Values.QueueNameTaken);

    public QueueNameTakenEncodedTag(string value)
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
    public static QueueNameTakenEncodedTag FromCustom(string value)
    {
        return new QueueNameTakenEncodedTag(value);
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

    public static bool operator ==(QueueNameTakenEncodedTag value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(QueueNameTakenEncodedTag value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(QueueNameTakenEncodedTag value) => value.Value;

    public static explicit operator QueueNameTakenEncodedTag(string value) => new(value);

    internal class QueueNameTakenEncodedTagSerializer : JsonConverter<QueueNameTakenEncodedTag>
    {
        public override QueueNameTakenEncodedTag Read(
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
            return new QueueNameTakenEncodedTag(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            QueueNameTakenEncodedTag value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override QueueNameTakenEncodedTag ReadAsPropertyName(
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
            return new QueueNameTakenEncodedTag(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            QueueNameTakenEncodedTag value,
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
        public const string QueueNameTaken = "QueueNameTaken";
    }
}
