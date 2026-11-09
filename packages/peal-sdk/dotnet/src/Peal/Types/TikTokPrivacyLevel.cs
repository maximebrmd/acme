using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(TikTokPrivacyLevel.TikTokPrivacyLevelSerializer))]
[Serializable]
public readonly record struct TikTokPrivacyLevel : IStringEnum
{
    public static readonly TikTokPrivacyLevel PublicToEveryone = new(Values.PublicToEveryone);

    public static readonly TikTokPrivacyLevel MutualFollowFriends = new(Values.MutualFollowFriends);

    public static readonly TikTokPrivacyLevel FollowerOfCreator = new(Values.FollowerOfCreator);

    public static readonly TikTokPrivacyLevel SelfOnly = new(Values.SelfOnly);

    public TikTokPrivacyLevel(string value)
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
    public static TikTokPrivacyLevel FromCustom(string value)
    {
        return new TikTokPrivacyLevel(value);
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

    public static bool operator ==(TikTokPrivacyLevel value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(TikTokPrivacyLevel value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(TikTokPrivacyLevel value) => value.Value;

    public static explicit operator TikTokPrivacyLevel(string value) => new(value);

    internal class TikTokPrivacyLevelSerializer : JsonConverter<TikTokPrivacyLevel>
    {
        public override TikTokPrivacyLevel Read(
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
            return new TikTokPrivacyLevel(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            TikTokPrivacyLevel value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override TikTokPrivacyLevel ReadAsPropertyName(
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
            return new TikTokPrivacyLevel(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            TikTokPrivacyLevel value,
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
        public const string PublicToEveryone = "PUBLIC_TO_EVERYONE";

        public const string MutualFollowFriends = "MUTUAL_FOLLOW_FRIENDS";

        public const string FollowerOfCreator = "FOLLOWER_OF_CREATOR";

        public const string SelfOnly = "SELF_ONLY";
    }
}
