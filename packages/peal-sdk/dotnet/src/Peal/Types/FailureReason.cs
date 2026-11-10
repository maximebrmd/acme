using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(FailureReason.FailureReasonSerializer))]
[Serializable]
public readonly record struct FailureReason : IStringEnum
{
    public static readonly FailureReason ContentRejected = new(Values.ContentRejected);

    public static readonly FailureReason ChannelDisconnected = new(Values.ChannelDisconnected);

    public static readonly FailureReason ChannelDisabled = new(Values.ChannelDisabled);

    public static readonly FailureReason MediaRemoved = new(Values.MediaRemoved);

    public static readonly FailureReason MediaRejected = new(Values.MediaRejected);

    public static readonly FailureReason Missed = new(Values.Missed);

    public static readonly FailureReason NotPublished = new(Values.NotPublished);

    public static readonly FailureReason RateLimited = new(Values.RateLimited);

    public static readonly FailureReason TokenExpired = new(Values.TokenExpired);

    public static readonly FailureReason Unavailable = new(Values.Unavailable);

    public static readonly FailureReason AppNotAudited = new(Values.AppNotAudited);

    public static readonly FailureReason QuotaExceeded = new(Values.QuotaExceeded);

    public static readonly FailureReason AppBillingLimit = new(Values.AppBillingLimit);

    public static readonly FailureReason PlanLimit = new(Values.PlanLimit);

    public static readonly FailureReason PartsNotSent = new(Values.PartsNotSent);

    public static readonly FailureReason RepliesNotAllowed = new(Values.RepliesNotAllowed);

    public FailureReason(string value)
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
    public static FailureReason FromCustom(string value)
    {
        return new FailureReason(value);
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

    public static bool operator ==(FailureReason value1, string value2) =>
        value1.Value.Equals(value2);

    public static bool operator !=(FailureReason value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(FailureReason value) => value.Value;

    public static explicit operator FailureReason(string value) => new(value);

    internal class FailureReasonSerializer : JsonConverter<FailureReason>
    {
        public override FailureReason Read(
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
            return new FailureReason(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            FailureReason value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override FailureReason ReadAsPropertyName(
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
            return new FailureReason(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            FailureReason value,
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
        public const string ContentRejected = "contentRejected";

        public const string ChannelDisconnected = "channelDisconnected";

        public const string ChannelDisabled = "channelDisabled";

        public const string MediaRemoved = "mediaRemoved";

        public const string MediaRejected = "mediaRejected";

        public const string Missed = "missed";

        public const string NotPublished = "notPublished";

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
