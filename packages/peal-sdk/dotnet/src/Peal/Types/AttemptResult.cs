using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(AttemptResult.AttemptResultSerializer))]
[Serializable]
public readonly record struct AttemptResult : IStringEnum
{
    public static readonly AttemptResult Published = new(Values.Published);

    public static readonly AttemptResult Unconfirmed = new(Values.Unconfirmed);

    public static readonly AttemptResult ContentRejected = new(Values.ContentRejected);

    public static readonly AttemptResult ChannelDisconnected = new(Values.ChannelDisconnected);

    public static readonly AttemptResult ChannelDisabled = new(Values.ChannelDisabled);

    public static readonly AttemptResult MediaRemoved = new(Values.MediaRemoved);

    public static readonly AttemptResult MediaRejected = new(Values.MediaRejected);

    public static readonly AttemptResult RateLimited = new(Values.RateLimited);

    public static readonly AttemptResult TokenExpired = new(Values.TokenExpired);

    public static readonly AttemptResult Unavailable = new(Values.Unavailable);

    public static readonly AttemptResult AppNotAudited = new(Values.AppNotAudited);

    public static readonly AttemptResult QuotaExceeded = new(Values.QuotaExceeded);

    public static readonly AttemptResult AppBillingLimit = new(Values.AppBillingLimit);

    public static readonly AttemptResult PlanLimit = new(Values.PlanLimit);

    public static readonly AttemptResult PartsNotSent = new(Values.PartsNotSent);

    public static readonly AttemptResult RepliesNotAllowed = new(Values.RepliesNotAllowed);

    public AttemptResult(string value)
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
    public static AttemptResult FromCustom(string value)
    {
        return new AttemptResult(value);
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

    public static bool operator ==(AttemptResult value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(AttemptResult value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(AttemptResult value) => value.Value;

    public static explicit operator AttemptResult(string value) => new(value);

    internal class AttemptResultSerializer : JsonConverter<AttemptResult>
    {
        public override AttemptResult Read(
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
            return new AttemptResult(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            AttemptResult value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override AttemptResult ReadAsPropertyName(
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
            return new AttemptResult(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            AttemptResult value,
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
        public const string Published = "published";

        public const string Unconfirmed = "unconfirmed";

        public const string ContentRejected = "contentRejected";

        public const string ChannelDisconnected = "channelDisconnected";

        public const string ChannelDisabled = "channelDisabled";

        public const string MediaRemoved = "mediaRemoved";

        public const string MediaRejected = "mediaRejected";

        public const string RateLimited = "rateLimited";

        public const string TokenExpired = "tokenExpired";

        public const string Unavailable = "unavailable";

        public const string AppNotAudited = "appNotAudited";

        public const string QuotaExceeded = "quotaExceeded";

        public const string AppBillingLimit = "appBillingLimit";

        public const string PlanLimit = "planLimit";

        public const string PartsNotSent = "partsNotSent";

        public const string RepliesNotAllowed = "repliesNotAllowed";
    }
}
