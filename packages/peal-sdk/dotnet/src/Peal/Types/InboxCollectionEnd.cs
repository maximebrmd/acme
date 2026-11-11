using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(InboxCollectionEnd.InboxCollectionEndSerializer))]
[Serializable]
public readonly record struct InboxCollectionEnd : IStringEnum
{
    public static readonly InboxCollectionEnd Window = new(Values.Window);

    public static readonly InboxCollectionEnd Disconnected = new(Values.Disconnected);

    public static readonly InboxCollectionEnd Unsupported = new(Values.Unsupported);

    public static readonly InboxCollectionEnd Missing = new(Values.Missing);

    public static readonly InboxCollectionEnd Removed = new(Values.Removed);

    public InboxCollectionEnd(string value)
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
    public static InboxCollectionEnd FromCustom(string value)
    {
        return new InboxCollectionEnd(value);
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

    public static bool operator ==(InboxCollectionEnd value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(InboxCollectionEnd value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(InboxCollectionEnd value) => value.Value;

    public static explicit operator InboxCollectionEnd(string value) => new(value);

    internal class InboxCollectionEndSerializer : JsonConverter<InboxCollectionEnd>
    {
        public override InboxCollectionEnd Read(
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
            return new InboxCollectionEnd(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            InboxCollectionEnd value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override InboxCollectionEnd ReadAsPropertyName(
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
            return new InboxCollectionEnd(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            InboxCollectionEnd value,
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
        public const string Window = "window";

        public const string Disconnected = "disconnected";

        public const string Unsupported = "unsupported";

        public const string Missing = "missing";

        public const string Removed = "removed";
    }
}
