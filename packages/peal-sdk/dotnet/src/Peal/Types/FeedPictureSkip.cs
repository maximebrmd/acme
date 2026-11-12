using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FeedPictureSkip.FeedPictureSkipSerializer))]
[Serializable]
public readonly record struct FeedPictureSkip : IStringEnum
{
    public static readonly FeedPictureSkip NotPublic = new(Values.NotPublic);

    public static readonly FeedPictureSkip Unreachable = new(Values.Unreachable);

    public static readonly FeedPictureSkip TooLarge = new(Values.TooLarge);

    public static readonly FeedPictureSkip NotAnImage = new(Values.NotAnImage);

    public static readonly FeedPictureSkip StorageFull = new(Values.StorageFull);

    public static readonly FeedPictureSkip Busy = new(Values.Busy);

    public static readonly FeedPictureSkip NotAllowed = new(Values.NotAllowed);

    public static readonly FeedPictureSkip Failed = new(Values.Failed);

    public FeedPictureSkip(string value)
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
    public static FeedPictureSkip FromCustom(string value)
    {
        return new FeedPictureSkip(value);
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

    public static bool operator ==(FeedPictureSkip value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FeedPictureSkip value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FeedPictureSkip value) => value.Value;

    public static explicit operator FeedPictureSkip(string value) => new(value);

    internal class FeedPictureSkipSerializer : JsonConverter<FeedPictureSkip>
    {
        public override FeedPictureSkip Read(
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
            return new FeedPictureSkip(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FeedPictureSkip value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FeedPictureSkip ReadAsPropertyName(
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
            return new FeedPictureSkip(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FeedPictureSkip value,
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
        public const string NotPublic = "notPublic";

        public const string Unreachable = "unreachable";

        public const string TooLarge = "tooLarge";

        public const string NotAnImage = "notAnImage";

        public const string StorageFull = "storageFull";

        public const string Busy = "busy";

        public const string NotAllowed = "notAllowed";

        public const string Failed = "failed";
    }
}
