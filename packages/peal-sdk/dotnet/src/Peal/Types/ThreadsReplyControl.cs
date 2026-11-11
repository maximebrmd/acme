using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(ThreadsReplyControl.ThreadsReplyControlSerializer))]
[Serializable]
public readonly record struct ThreadsReplyControl : IStringEnum
{
    public static readonly ThreadsReplyControl Everyone = new(Values.Everyone);

    public static readonly ThreadsReplyControl AccountsYouFollow = new(Values.AccountsYouFollow);

    public static readonly ThreadsReplyControl MentionedOnly = new(Values.MentionedOnly);

    public static readonly ThreadsReplyControl ParentPostAuthorOnly = new(
        Values.ParentPostAuthorOnly
    );

    public static readonly ThreadsReplyControl FollowersOnly = new(Values.FollowersOnly);

    public ThreadsReplyControl(string value)
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
    public static ThreadsReplyControl FromCustom(string value)
    {
        return new ThreadsReplyControl(value);
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

    public static bool operator ==(ThreadsReplyControl value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(ThreadsReplyControl value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(ThreadsReplyControl value) => value.Value;

    public static explicit operator ThreadsReplyControl(string value) => new(value);

    internal class ThreadsReplyControlSerializer : JsonConverter<ThreadsReplyControl>
    {
        public override ThreadsReplyControl Read(
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
            return new ThreadsReplyControl(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            ThreadsReplyControl value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override ThreadsReplyControl ReadAsPropertyName(
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
            return new ThreadsReplyControl(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            ThreadsReplyControl value,
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
        public const string Everyone = "everyone";

        public const string AccountsYouFollow = "accounts_you_follow";

        public const string MentionedOnly = "mentioned_only";

        public const string ParentPostAuthorOnly = "parent_post_author_only";

        public const string FollowersOnly = "followers_only";
    }
}
