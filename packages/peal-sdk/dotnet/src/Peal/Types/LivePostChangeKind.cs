using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(LivePostChangeKind.LivePostChangeKindSerializer))]
[Serializable]
public readonly record struct LivePostChangeKind : IStringEnum
{
    public static readonly LivePostChangeKind Unpublish = new(Values.Unpublish);

    public static readonly LivePostChangeKind Edit = new(Values.Edit);

    public LivePostChangeKind(string value)
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
    public static LivePostChangeKind FromCustom(string value)
    {
        return new LivePostChangeKind(value);
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

    public static bool operator ==(LivePostChangeKind value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(LivePostChangeKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(LivePostChangeKind value) => value.Value;

    public static explicit operator LivePostChangeKind(string value) => new(value);

    internal class LivePostChangeKindSerializer : JsonConverter<LivePostChangeKind>
    {
        public override LivePostChangeKind Read(
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
            return new LivePostChangeKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            LivePostChangeKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override LivePostChangeKind ReadAsPropertyName(
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
            return new LivePostChangeKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            LivePostChangeKind value,
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
        public const string Unpublish = "unpublish";

        public const string Edit = "edit";
    }
}
