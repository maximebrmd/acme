using global::System.Text.Json;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(Permission.PermissionSerializer))]
[Serializable]
public readonly record struct Permission : IStringEnum
{
    public static readonly Permission AnalyticsRead = new(Values.AnalyticsRead);

    public static readonly Permission ApiKeyCreate = new(Values.ApiKeyCreate);

    public static readonly Permission ApiKeyRead = new(Values.ApiKeyRead);

    public static readonly Permission ApiKeyUpdate = new(Values.ApiKeyUpdate);

    public static readonly Permission ApiKeyDelete = new(Values.ApiKeyDelete);

    public static readonly Permission AssistantUse = new(Values.AssistantUse);

    public static readonly Permission BillingRead = new(Values.BillingRead);

    public static readonly Permission BillingManage = new(Values.BillingManage);

    public static readonly Permission ChannelRead = new(Values.ChannelRead);

    public static readonly Permission ChannelConnect = new(Values.ChannelConnect);

    public static readonly Permission ChannelDisconnect = new(Values.ChannelDisconnect);

    public static readonly Permission InvitationCreate = new(Values.InvitationCreate);

    public static readonly Permission InvitationCancel = new(Values.InvitationCancel);

    public static readonly Permission MediaRead = new(Values.MediaRead);

    public static readonly Permission MediaUpload = new(Values.MediaUpload);

    public static readonly Permission MediaDelete = new(Values.MediaDelete);

    public static readonly Permission MemberCreate = new(Values.MemberCreate);

    public static readonly Permission MemberUpdate = new(Values.MemberUpdate);

    public static readonly Permission MemberDelete = new(Values.MemberDelete);

    public static readonly Permission OrganizationUpdate = new(Values.OrganizationUpdate);

    public static readonly Permission OrganizationDelete = new(Values.OrganizationDelete);

    public static readonly Permission PostRead = new(Values.PostRead);

    public static readonly Permission PostCreate = new(Values.PostCreate);

    public static readonly Permission PostUpdate = new(Values.PostUpdate);

    public static readonly Permission PostDelete = new(Values.PostDelete);

    public static readonly Permission PostSchedule = new(Values.PostSchedule);

    public static readonly Permission PostApprove = new(Values.PostApprove);

    public static readonly Permission PostPublish = new(Values.PostPublish);

    public static readonly Permission WebhookRead = new(Values.WebhookRead);

    public static readonly Permission WebhookManage = new(Values.WebhookManage);

    public Permission(string value)
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
    public static Permission FromCustom(string value)
    {
        return new Permission(value);
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

    public static bool operator ==(Permission value1, string value2) => value1.Value.Equals(value2);

    public static bool operator !=(Permission value1, string value2) =>
        !value1.Value.Equals(value2);

    public static explicit operator string(Permission value) => value.Value;

    public static explicit operator Permission(string value) => new(value);

    internal class PermissionSerializer : JsonConverter<Permission>
    {
        public override Permission Read(
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
            return new Permission(stringValue);
        }

        public override void Write(
            Utf8JsonWriter writer,
            Permission value,
            JsonSerializerOptions options
        )
        {
            writer.WriteStringValue(value.Value);
        }

        public override Permission ReadAsPropertyName(
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
            return new Permission(stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            Permission value,
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
        public const string AnalyticsRead = "analytics:read";

        public const string ApiKeyCreate = "apiKey:create";

        public const string ApiKeyRead = "apiKey:read";

        public const string ApiKeyUpdate = "apiKey:update";

        public const string ApiKeyDelete = "apiKey:delete";

        public const string AssistantUse = "assistant:use";

        public const string BillingRead = "billing:read";

        public const string BillingManage = "billing:manage";

        public const string ChannelRead = "channel:read";

        public const string ChannelConnect = "channel:connect";

        public const string ChannelDisconnect = "channel:disconnect";

        public const string InvitationCreate = "invitation:create";

        public const string InvitationCancel = "invitation:cancel";

        public const string MediaRead = "media:read";

        public const string MediaUpload = "media:upload";

        public const string MediaDelete = "media:delete";

        public const string MemberCreate = "member:create";

        public const string MemberUpdate = "member:update";

        public const string MemberDelete = "member:delete";

        public const string OrganizationUpdate = "organization:update";

        public const string OrganizationDelete = "organization:delete";

        public const string PostRead = "post:read";

        public const string PostCreate = "post:create";

        public const string PostUpdate = "post:update";

        public const string PostDelete = "post:delete";

        public const string PostSchedule = "post:schedule";

        public const string PostApprove = "post:approve";

        public const string PostPublish = "post:publish";

        public const string WebhookRead = "webhook:read";

        public const string WebhookManage = "webhook:manage";
    }
}
