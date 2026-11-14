using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FollowUpKind.FollowUpKindSerializer))]
[Serializable]
public readonly record struct FollowUpKind : IStringEnum
{
    public static readonly FollowUpKind Comment = new(Values.Comment);

    public static readonly FollowUpKind Repost = new(Values.Repost);

    public FollowUpKind(string value)
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
    public static FollowUpKind FromCustom(string value)
    {
        return new FollowUpKind(value);
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

    public static bool operator ==(FollowUpKind value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FollowUpKind value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FollowUpKind value) => value.Value;

    public static explicit operator FollowUpKind(string value) => new(value);

    internal class FollowUpKindSerializer : JsonConverter<FollowUpKind>
    {
        public override FollowUpKind Read(
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
            return new FollowUpKind(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FollowUpKind value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FollowUpKind ReadAsPropertyName(
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
            return new FollowUpKind(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FollowUpKind value,
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
        public const string Comment = "comment";

        public const string Repost = "repost";
    }
}
