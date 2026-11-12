using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FeedFailure.FeedFailureSerializer))]
[Serializable]
public readonly record struct FeedFailure : IStringEnum
{
    public static readonly FeedFailure Timeout = new(Values.Timeout);

    public static readonly FeedFailure RateLimited = new(Values.RateLimited);

    public static readonly FeedFailure ServerError = new(Values.ServerError);

    public static readonly FeedFailure NotFound = new(Values.NotFound);

    public static readonly FeedFailure Gone = new(Values.Gone);

    public static readonly FeedFailure NotAFeed = new(Values.NotAFeed);

    public static readonly FeedFailure TooLarge = new(Values.TooLarge);

    public static readonly FeedFailure Refused = new(Values.Refused);

    public static readonly FeedFailure Unreachable = new(Values.Unreachable);

    public FeedFailure(string value)
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
    public static FeedFailure FromCustom(string value)
    {
        return new FeedFailure(value);
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

    public static bool operator ==(FeedFailure value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FeedFailure value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FeedFailure value) => value.Value;

    public static explicit operator FeedFailure(string value) => new(value);

    internal class FeedFailureSerializer : JsonConverter<FeedFailure>
    {
        public override FeedFailure Read(
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
            return new FeedFailure(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FeedFailure value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FeedFailure ReadAsPropertyName(
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
            return new FeedFailure(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FeedFailure value,
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
        public const string Timeout = "timeout";

        public const string RateLimited = "rateLimited";

        public const string ServerError = "serverError";

        public const string NotFound = "notFound";

        public const string Gone = "gone";

        public const string NotAFeed = "notAFeed";

        public const string TooLarge = "tooLarge";

        public const string Refused = "refused";

        public const string Unreachable = "unreachable";
    }
}
