using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(PostStatus.PostStatusSerializer))]
[Serializable]
public readonly record struct PostStatus : IStringEnum
{
    public static readonly PostStatus Draft = new(Values.Draft);

    public static readonly PostStatus AwaitingApproval = new(Values.AwaitingApproval);

    public static readonly PostStatus Scheduled = new(Values.Scheduled);

    public static readonly PostStatus Publishing = new(Values.Publishing);

    public static readonly PostStatus Finished = new(Values.Finished);

    public static readonly PostStatus Cancelled = new(Values.Cancelled);

    public PostStatus(string value)
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
    public static PostStatus FromCustom(string value)
    {
        return new PostStatus(value);
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

    public static bool operator ==(PostStatus value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(PostStatus value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(PostStatus value) => value.Value;

    public static explicit operator PostStatus(string value) => new(value);

    internal class PostStatusSerializer : JsonConverter<PostStatus>
    {
        public override PostStatus Read(
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
            return new PostStatus(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            PostStatus value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override PostStatus ReadAsPropertyName(
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
            return new PostStatus(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            PostStatus value,
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
        public const string Draft = "draft";

        public const string AwaitingApproval = "awaitingApproval";

        public const string Scheduled = "scheduled";

        public const string Publishing = "publishing";

        public const string Finished = "finished";

        public const string Cancelled = "cancelled";
    }
}
