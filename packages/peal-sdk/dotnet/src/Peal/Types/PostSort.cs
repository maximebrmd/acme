using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PostSort.PostSortSerializer))]
[Serializable]
public readonly record struct PostSort : IStringEnum
{
    public static readonly PostSort CreatedDesc = new(Values.CreatedDesc);

    public static readonly PostSort CreatedAsc = new(Values.CreatedAsc);

    public static readonly PostSort ScheduledDesc = new(Values.ScheduledDesc);

    public static readonly PostSort ScheduledAsc = new(Values.ScheduledAsc);

    public PostSort(string value)
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
    public static PostSort FromCustom(string value)
    {
        return new PostSort(value);
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

    public static bool operator ==(PostSort value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(PostSort value1, string value2) => !value1.Value.Equals(value2);

    public static explicit operator string(PostSort value) => value.Value;

    public static explicit operator PostSort(string value) => new(value);

    internal class PostSortSerializer : JsonConverter<PostSort>
    {
        public override PostSort Read(
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
            return new PostSort(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PostSort value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PostSort ReadAsPropertyName(
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
            return new PostSort(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PostSort value,
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
        public const string CreatedDesc = "createdDesc";

        public const string CreatedAsc = "createdAsc";

        public const string ScheduledDesc = "scheduledDesc";

        public const string ScheduledAsc = "scheduledAsc";
    }
}
