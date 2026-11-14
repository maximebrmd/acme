// ReSharper disable NullableWarningSuppressionIsUsed
// ReSharper disable InconsistentNaming

using global::System.Text.Json;
using global::System.Text.Json.Nodes;
using global::System.Text.Json.Serialization;
using Peal.Core;

namespace Peal;

[JsonConverter(typeof(NoticeEvent.JsonConverter))]
[Serializable]
public record NoticeEvent
{
    internal NoticeEvent(string type, object? value)
    {
        Type = type;
        Value = value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.PostPublished"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.PostPublished value)
    {
        Type = "PostPublished";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.PostFailed"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.PostFailed value)
    {
        Type = "PostFailed";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.PostUnconfirmed"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.PostUnconfirmed value)
    {
        Type = "PostUnconfirmed";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.PostApprovalRequested"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.PostApprovalRequested value)
    {
        Type = "PostApprovalRequested";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.PostApproved"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.PostApproved value)
    {
        Type = "PostApproved";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.PostChangesRequested"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.PostChangesRequested value)
    {
        Type = "PostChangesRequested";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.PostCommented"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.PostCommented value)
    {
        Type = "PostCommented";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.CommentsReceived"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.CommentsReceived value)
    {
        Type = "CommentsReceived";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.ChannelReconnectRequired"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.ChannelReconnectRequired value)
    {
        Type = "ChannelReconnectRequired";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.ChannelReconnectSoon"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.ChannelReconnectSoon value)
    {
        Type = "ChannelReconnectSoon";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.SubscriptionStarted"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.SubscriptionStarted value)
    {
        Type = "SubscriptionStarted";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.TrialEnding"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.TrialEnding value)
    {
        Type = "TrialEnding";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.PaymentMethodNeeded"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.PaymentMethodNeeded value)
    {
        Type = "PaymentMethodNeeded";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.AllowanceReached"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.AllowanceReached value)
    {
        Type = "AllowanceReached";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.XSpendCeiling"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.XSpendCeiling value)
    {
        Type = "XSpendCeiling";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.SubscriptionRenewing"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.SubscriptionRenewing value)
    {
        Type = "SubscriptionRenewing";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.SubscriptionCancelled"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.SubscriptionCancelled value)
    {
        Type = "SubscriptionCancelled";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.SubscriptionWithdrawn"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.SubscriptionWithdrawn value)
    {
        Type = "SubscriptionWithdrawn";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.WebhookEndpointDisabled"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.WebhookEndpointDisabled value)
    {
        Type = "WebhookEndpointDisabled";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.WebhookDeliveriesFailing"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.WebhookDeliveriesFailing value)
    {
        Type = "WebhookDeliveriesFailing";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.AdBoostChanged"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.AdBoostChanged value)
    {
        Type = "AdBoostChanged";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.AdConnectionReconnectRequired"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.AdConnectionReconnectRequired value)
    {
        Type = "AdConnectionReconnectRequired";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.RecyclingEnded"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.RecyclingEnded value)
    {
        Type = "RecyclingEnded";
        Value = value.Value;
    }

    /// <summary>
    /// Create an instance of NoticeEvent with <see cref="NoticeEvent.FeedStopped"/>.
    /// </summary>
    public NoticeEvent(NoticeEvent.FeedStopped value)
    {
        Type = "FeedStopped";
        Value = value.Value;
    }

    /// <summary>
    /// Discriminant value
    /// </summary>
    [JsonPropertyName("_tag")]
    public string Type { get; internal set; }

    /// <summary>
    /// Discriminated union value
    /// </summary>
    public object? Value { get; internal set; }

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PostPublished"
    /// </summary>
    public bool IsPostPublished => Type == "PostPublished";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PostFailed"
    /// </summary>
    public bool IsPostFailed => Type == "PostFailed";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PostUnconfirmed"
    /// </summary>
    public bool IsPostUnconfirmed => Type == "PostUnconfirmed";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PostApprovalRequested"
    /// </summary>
    public bool IsPostApprovalRequested => Type == "PostApprovalRequested";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PostApproved"
    /// </summary>
    public bool IsPostApproved => Type == "PostApproved";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PostChangesRequested"
    /// </summary>
    public bool IsPostChangesRequested => Type == "PostChangesRequested";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PostCommented"
    /// </summary>
    public bool IsPostCommented => Type == "PostCommented";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "CommentsReceived"
    /// </summary>
    public bool IsCommentsReceived => Type == "CommentsReceived";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "ChannelReconnectRequired"
    /// </summary>
    public bool IsChannelReconnectRequired => Type == "ChannelReconnectRequired";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "ChannelReconnectSoon"
    /// </summary>
    public bool IsChannelReconnectSoon => Type == "ChannelReconnectSoon";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "SubscriptionStarted"
    /// </summary>
    public bool IsSubscriptionStarted => Type == "SubscriptionStarted";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "TrialEnding"
    /// </summary>
    public bool IsTrialEnding => Type == "TrialEnding";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "PaymentMethodNeeded"
    /// </summary>
    public bool IsPaymentMethodNeeded => Type == "PaymentMethodNeeded";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "AllowanceReached"
    /// </summary>
    public bool IsAllowanceReached => Type == "AllowanceReached";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "XSpendCeiling"
    /// </summary>
    public bool IsXSpendCeiling => Type == "XSpendCeiling";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "SubscriptionRenewing"
    /// </summary>
    public bool IsSubscriptionRenewing => Type == "SubscriptionRenewing";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "SubscriptionCancelled"
    /// </summary>
    public bool IsSubscriptionCancelled => Type == "SubscriptionCancelled";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "SubscriptionWithdrawn"
    /// </summary>
    public bool IsSubscriptionWithdrawn => Type == "SubscriptionWithdrawn";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "WebhookEndpointDisabled"
    /// </summary>
    public bool IsWebhookEndpointDisabled => Type == "WebhookEndpointDisabled";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "WebhookDeliveriesFailing"
    /// </summary>
    public bool IsWebhookDeliveriesFailing => Type == "WebhookDeliveriesFailing";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "AdBoostChanged"
    /// </summary>
    public bool IsAdBoostChanged => Type == "AdBoostChanged";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "AdConnectionReconnectRequired"
    /// </summary>
    public bool IsAdConnectionReconnectRequired => Type == "AdConnectionReconnectRequired";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "RecyclingEnded"
    /// </summary>
    public bool IsRecyclingEnded => Type == "RecyclingEnded";

    /// <summary>
    /// Returns true if <see cref="Type"/> is "FeedStopped"
    /// </summary>
    public bool IsFeedStopped => Type == "FeedStopped";

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventPostPublished"/> if <see cref="Type"/> is 'PostPublished', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostPublished'.</exception>
    public Peal.NoticeEventPostPublished AsPostPublished() =>
        IsPostPublished
            ? (Peal.NoticeEventPostPublished)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'PostPublished'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventPostFailed"/> if <see cref="Type"/> is 'PostFailed', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostFailed'.</exception>
    public Peal.NoticeEventPostFailed AsPostFailed() =>
        IsPostFailed
            ? (Peal.NoticeEventPostFailed)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'PostFailed'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventPostUnconfirmed"/> if <see cref="Type"/> is 'PostUnconfirmed', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostUnconfirmed'.</exception>
    public Peal.NoticeEventPostUnconfirmed AsPostUnconfirmed() =>
        IsPostUnconfirmed
            ? (Peal.NoticeEventPostUnconfirmed)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'PostUnconfirmed'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventPostApprovalRequested"/> if <see cref="Type"/> is 'PostApprovalRequested', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostApprovalRequested'.</exception>
    public Peal.NoticeEventPostApprovalRequested AsPostApprovalRequested() =>
        IsPostApprovalRequested
            ? (Peal.NoticeEventPostApprovalRequested)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'PostApprovalRequested'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventPostApproved"/> if <see cref="Type"/> is 'PostApproved', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostApproved'.</exception>
    public Peal.NoticeEventPostApproved AsPostApproved() =>
        IsPostApproved
            ? (Peal.NoticeEventPostApproved)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'PostApproved'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventPostChangesRequested"/> if <see cref="Type"/> is 'PostChangesRequested', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostChangesRequested'.</exception>
    public Peal.NoticeEventPostChangesRequested AsPostChangesRequested() =>
        IsPostChangesRequested
            ? (Peal.NoticeEventPostChangesRequested)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'PostChangesRequested'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventPostCommented"/> if <see cref="Type"/> is 'PostCommented', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PostCommented'.</exception>
    public Peal.NoticeEventPostCommented AsPostCommented() =>
        IsPostCommented
            ? (Peal.NoticeEventPostCommented)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'PostCommented'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventCommentsReceived"/> if <see cref="Type"/> is 'CommentsReceived', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'CommentsReceived'.</exception>
    public Peal.NoticeEventCommentsReceived AsCommentsReceived() =>
        IsCommentsReceived
            ? (Peal.NoticeEventCommentsReceived)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'CommentsReceived'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventChannelReconnectRequired"/> if <see cref="Type"/> is 'ChannelReconnectRequired', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ChannelReconnectRequired'.</exception>
    public Peal.NoticeEventChannelReconnectRequired AsChannelReconnectRequired() =>
        IsChannelReconnectRequired
            ? (Peal.NoticeEventChannelReconnectRequired)Value!
            : throw new global::System.Exception(
                "NoticeEvent.Type is not 'ChannelReconnectRequired'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventChannelReconnectSoon"/> if <see cref="Type"/> is 'ChannelReconnectSoon', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'ChannelReconnectSoon'.</exception>
    public Peal.NoticeEventChannelReconnectSoon AsChannelReconnectSoon() =>
        IsChannelReconnectSoon
            ? (Peal.NoticeEventChannelReconnectSoon)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'ChannelReconnectSoon'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventSubscriptionStarted"/> if <see cref="Type"/> is 'SubscriptionStarted', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'SubscriptionStarted'.</exception>
    public Peal.NoticeEventSubscriptionStarted AsSubscriptionStarted() =>
        IsSubscriptionStarted
            ? (Peal.NoticeEventSubscriptionStarted)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'SubscriptionStarted'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventTrialEnding"/> if <see cref="Type"/> is 'TrialEnding', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'TrialEnding'.</exception>
    public Peal.NoticeEventTrialEnding AsTrialEnding() =>
        IsTrialEnding
            ? (Peal.NoticeEventTrialEnding)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'TrialEnding'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventPaymentMethodNeeded"/> if <see cref="Type"/> is 'PaymentMethodNeeded', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'PaymentMethodNeeded'.</exception>
    public Peal.NoticeEventPaymentMethodNeeded AsPaymentMethodNeeded() =>
        IsPaymentMethodNeeded
            ? (Peal.NoticeEventPaymentMethodNeeded)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'PaymentMethodNeeded'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventAllowanceReached"/> if <see cref="Type"/> is 'AllowanceReached', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'AllowanceReached'.</exception>
    public Peal.NoticeEventAllowanceReached AsAllowanceReached() =>
        IsAllowanceReached
            ? (Peal.NoticeEventAllowanceReached)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'AllowanceReached'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventXSpendCeiling"/> if <see cref="Type"/> is 'XSpendCeiling', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'XSpendCeiling'.</exception>
    public Peal.NoticeEventXSpendCeiling AsXSpendCeiling() =>
        IsXSpendCeiling
            ? (Peal.NoticeEventXSpendCeiling)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'XSpendCeiling'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventSubscriptionRenewing"/> if <see cref="Type"/> is 'SubscriptionRenewing', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'SubscriptionRenewing'.</exception>
    public Peal.NoticeEventSubscriptionRenewing AsSubscriptionRenewing() =>
        IsSubscriptionRenewing
            ? (Peal.NoticeEventSubscriptionRenewing)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'SubscriptionRenewing'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventSubscriptionCancelled"/> if <see cref="Type"/> is 'SubscriptionCancelled', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'SubscriptionCancelled'.</exception>
    public Peal.NoticeEventSubscriptionCancelled AsSubscriptionCancelled() =>
        IsSubscriptionCancelled
            ? (Peal.NoticeEventSubscriptionCancelled)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'SubscriptionCancelled'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventSubscriptionWithdrawn"/> if <see cref="Type"/> is 'SubscriptionWithdrawn', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'SubscriptionWithdrawn'.</exception>
    public Peal.NoticeEventSubscriptionWithdrawn AsSubscriptionWithdrawn() =>
        IsSubscriptionWithdrawn
            ? (Peal.NoticeEventSubscriptionWithdrawn)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'SubscriptionWithdrawn'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventWebhookEndpointDisabled"/> if <see cref="Type"/> is 'WebhookEndpointDisabled', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'WebhookEndpointDisabled'.</exception>
    public Peal.NoticeEventWebhookEndpointDisabled AsWebhookEndpointDisabled() =>
        IsWebhookEndpointDisabled
            ? (Peal.NoticeEventWebhookEndpointDisabled)Value!
            : throw new global::System.Exception(
                "NoticeEvent.Type is not 'WebhookEndpointDisabled'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventWebhookDeliveriesFailing"/> if <see cref="Type"/> is 'WebhookDeliveriesFailing', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'WebhookDeliveriesFailing'.</exception>
    public Peal.NoticeEventWebhookDeliveriesFailing AsWebhookDeliveriesFailing() =>
        IsWebhookDeliveriesFailing
            ? (Peal.NoticeEventWebhookDeliveriesFailing)Value!
            : throw new global::System.Exception(
                "NoticeEvent.Type is not 'WebhookDeliveriesFailing'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventAdBoostChanged"/> if <see cref="Type"/> is 'AdBoostChanged', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'AdBoostChanged'.</exception>
    public Peal.NoticeEventAdBoostChanged AsAdBoostChanged() =>
        IsAdBoostChanged
            ? (Peal.NoticeEventAdBoostChanged)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'AdBoostChanged'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventAdConnectionReconnectRequired"/> if <see cref="Type"/> is 'AdConnectionReconnectRequired', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'AdConnectionReconnectRequired'.</exception>
    public Peal.NoticeEventAdConnectionReconnectRequired AsAdConnectionReconnectRequired() =>
        IsAdConnectionReconnectRequired
            ? (Peal.NoticeEventAdConnectionReconnectRequired)Value!
            : throw new global::System.Exception(
                "NoticeEvent.Type is not 'AdConnectionReconnectRequired'"
            );

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventRecyclingEnded"/> if <see cref="Type"/> is 'RecyclingEnded', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'RecyclingEnded'.</exception>
    public Peal.NoticeEventRecyclingEnded AsRecyclingEnded() =>
        IsRecyclingEnded
            ? (Peal.NoticeEventRecyclingEnded)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'RecyclingEnded'");

    /// <summary>
    /// Returns the value as a <see cref="Peal.NoticeEventFeedStopped"/> if <see cref="Type"/> is 'FeedStopped', otherwise throws an exception.
    /// </summary>
    /// <exception cref="Exception">Thrown when <see cref="Type"/> is not 'FeedStopped'.</exception>
    public Peal.NoticeEventFeedStopped AsFeedStopped() =>
        IsFeedStopped
            ? (Peal.NoticeEventFeedStopped)Value!
            : throw new global::System.Exception("NoticeEvent.Type is not 'FeedStopped'");

    public T Match<T>(
        Func<Peal.NoticeEventPostPublished, T> onPostPublished,
        Func<Peal.NoticeEventPostFailed, T> onPostFailed,
        Func<Peal.NoticeEventPostUnconfirmed, T> onPostUnconfirmed,
        Func<Peal.NoticeEventPostApprovalRequested, T> onPostApprovalRequested,
        Func<Peal.NoticeEventPostApproved, T> onPostApproved,
        Func<Peal.NoticeEventPostChangesRequested, T> onPostChangesRequested,
        Func<Peal.NoticeEventPostCommented, T> onPostCommented,
        Func<Peal.NoticeEventCommentsReceived, T> onCommentsReceived,
        Func<Peal.NoticeEventChannelReconnectRequired, T> onChannelReconnectRequired,
        Func<Peal.NoticeEventChannelReconnectSoon, T> onChannelReconnectSoon,
        Func<Peal.NoticeEventSubscriptionStarted, T> onSubscriptionStarted,
        Func<Peal.NoticeEventTrialEnding, T> onTrialEnding,
        Func<Peal.NoticeEventPaymentMethodNeeded, T> onPaymentMethodNeeded,
        Func<Peal.NoticeEventAllowanceReached, T> onAllowanceReached,
        Func<Peal.NoticeEventXSpendCeiling, T> onXSpendCeiling,
        Func<Peal.NoticeEventSubscriptionRenewing, T> onSubscriptionRenewing,
        Func<Peal.NoticeEventSubscriptionCancelled, T> onSubscriptionCancelled,
        Func<Peal.NoticeEventSubscriptionWithdrawn, T> onSubscriptionWithdrawn,
        Func<Peal.NoticeEventWebhookEndpointDisabled, T> onWebhookEndpointDisabled,
        Func<Peal.NoticeEventWebhookDeliveriesFailing, T> onWebhookDeliveriesFailing,
        Func<Peal.NoticeEventAdBoostChanged, T> onAdBoostChanged,
        Func<Peal.NoticeEventAdConnectionReconnectRequired, T> onAdConnectionReconnectRequired,
        Func<Peal.NoticeEventRecyclingEnded, T> onRecyclingEnded,
        Func<Peal.NoticeEventFeedStopped, T> onFeedStopped,
        Func<string, object?, T> onUnknown_
    )
    {
        return Type switch
        {
            "PostPublished" => onPostPublished(AsPostPublished()),
            "PostFailed" => onPostFailed(AsPostFailed()),
            "PostUnconfirmed" => onPostUnconfirmed(AsPostUnconfirmed()),
            "PostApprovalRequested" => onPostApprovalRequested(AsPostApprovalRequested()),
            "PostApproved" => onPostApproved(AsPostApproved()),
            "PostChangesRequested" => onPostChangesRequested(AsPostChangesRequested()),
            "PostCommented" => onPostCommented(AsPostCommented()),
            "CommentsReceived" => onCommentsReceived(AsCommentsReceived()),
            "ChannelReconnectRequired" => onChannelReconnectRequired(AsChannelReconnectRequired()),
            "ChannelReconnectSoon" => onChannelReconnectSoon(AsChannelReconnectSoon()),
            "SubscriptionStarted" => onSubscriptionStarted(AsSubscriptionStarted()),
            "TrialEnding" => onTrialEnding(AsTrialEnding()),
            "PaymentMethodNeeded" => onPaymentMethodNeeded(AsPaymentMethodNeeded()),
            "AllowanceReached" => onAllowanceReached(AsAllowanceReached()),
            "XSpendCeiling" => onXSpendCeiling(AsXSpendCeiling()),
            "SubscriptionRenewing" => onSubscriptionRenewing(AsSubscriptionRenewing()),
            "SubscriptionCancelled" => onSubscriptionCancelled(AsSubscriptionCancelled()),
            "SubscriptionWithdrawn" => onSubscriptionWithdrawn(AsSubscriptionWithdrawn()),
            "WebhookEndpointDisabled" => onWebhookEndpointDisabled(AsWebhookEndpointDisabled()),
            "WebhookDeliveriesFailing" => onWebhookDeliveriesFailing(AsWebhookDeliveriesFailing()),
            "AdBoostChanged" => onAdBoostChanged(AsAdBoostChanged()),
            "AdConnectionReconnectRequired" => onAdConnectionReconnectRequired(
                AsAdConnectionReconnectRequired()
            ),
            "RecyclingEnded" => onRecyclingEnded(AsRecyclingEnded()),
            "FeedStopped" => onFeedStopped(AsFeedStopped()),
            _ => onUnknown_(Type, Value),
        };
    }

    public void Visit(
        Action<Peal.NoticeEventPostPublished> onPostPublished,
        Action<Peal.NoticeEventPostFailed> onPostFailed,
        Action<Peal.NoticeEventPostUnconfirmed> onPostUnconfirmed,
        Action<Peal.NoticeEventPostApprovalRequested> onPostApprovalRequested,
        Action<Peal.NoticeEventPostApproved> onPostApproved,
        Action<Peal.NoticeEventPostChangesRequested> onPostChangesRequested,
        Action<Peal.NoticeEventPostCommented> onPostCommented,
        Action<Peal.NoticeEventCommentsReceived> onCommentsReceived,
        Action<Peal.NoticeEventChannelReconnectRequired> onChannelReconnectRequired,
        Action<Peal.NoticeEventChannelReconnectSoon> onChannelReconnectSoon,
        Action<Peal.NoticeEventSubscriptionStarted> onSubscriptionStarted,
        Action<Peal.NoticeEventTrialEnding> onTrialEnding,
        Action<Peal.NoticeEventPaymentMethodNeeded> onPaymentMethodNeeded,
        Action<Peal.NoticeEventAllowanceReached> onAllowanceReached,
        Action<Peal.NoticeEventXSpendCeiling> onXSpendCeiling,
        Action<Peal.NoticeEventSubscriptionRenewing> onSubscriptionRenewing,
        Action<Peal.NoticeEventSubscriptionCancelled> onSubscriptionCancelled,
        Action<Peal.NoticeEventSubscriptionWithdrawn> onSubscriptionWithdrawn,
        Action<Peal.NoticeEventWebhookEndpointDisabled> onWebhookEndpointDisabled,
        Action<Peal.NoticeEventWebhookDeliveriesFailing> onWebhookDeliveriesFailing,
        Action<Peal.NoticeEventAdBoostChanged> onAdBoostChanged,
        Action<Peal.NoticeEventAdConnectionReconnectRequired> onAdConnectionReconnectRequired,
        Action<Peal.NoticeEventRecyclingEnded> onRecyclingEnded,
        Action<Peal.NoticeEventFeedStopped> onFeedStopped,
        Action<string, object?> onUnknown_
    )
    {
        switch (Type)
        {
            case "PostPublished":
                onPostPublished(AsPostPublished());
                break;
            case "PostFailed":
                onPostFailed(AsPostFailed());
                break;
            case "PostUnconfirmed":
                onPostUnconfirmed(AsPostUnconfirmed());
                break;
            case "PostApprovalRequested":
                onPostApprovalRequested(AsPostApprovalRequested());
                break;
            case "PostApproved":
                onPostApproved(AsPostApproved());
                break;
            case "PostChangesRequested":
                onPostChangesRequested(AsPostChangesRequested());
                break;
            case "PostCommented":
                onPostCommented(AsPostCommented());
                break;
            case "CommentsReceived":
                onCommentsReceived(AsCommentsReceived());
                break;
            case "ChannelReconnectRequired":
                onChannelReconnectRequired(AsChannelReconnectRequired());
                break;
            case "ChannelReconnectSoon":
                onChannelReconnectSoon(AsChannelReconnectSoon());
                break;
            case "SubscriptionStarted":
                onSubscriptionStarted(AsSubscriptionStarted());
                break;
            case "TrialEnding":
                onTrialEnding(AsTrialEnding());
                break;
            case "PaymentMethodNeeded":
                onPaymentMethodNeeded(AsPaymentMethodNeeded());
                break;
            case "AllowanceReached":
                onAllowanceReached(AsAllowanceReached());
                break;
            case "XSpendCeiling":
                onXSpendCeiling(AsXSpendCeiling());
                break;
            case "SubscriptionRenewing":
                onSubscriptionRenewing(AsSubscriptionRenewing());
                break;
            case "SubscriptionCancelled":
                onSubscriptionCancelled(AsSubscriptionCancelled());
                break;
            case "SubscriptionWithdrawn":
                onSubscriptionWithdrawn(AsSubscriptionWithdrawn());
                break;
            case "WebhookEndpointDisabled":
                onWebhookEndpointDisabled(AsWebhookEndpointDisabled());
                break;
            case "WebhookDeliveriesFailing":
                onWebhookDeliveriesFailing(AsWebhookDeliveriesFailing());
                break;
            case "AdBoostChanged":
                onAdBoostChanged(AsAdBoostChanged());
                break;
            case "AdConnectionReconnectRequired":
                onAdConnectionReconnectRequired(AsAdConnectionReconnectRequired());
                break;
            case "RecyclingEnded":
                onRecyclingEnded(AsRecyclingEnded());
                break;
            case "FeedStopped":
                onFeedStopped(AsFeedStopped());
                break;
            default:
                onUnknown_(Type, Value);
                break;
        }
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventPostPublished"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostPublished(out Peal.NoticeEventPostPublished? value)
    {
        if (Type == "PostPublished")
        {
            value = (Peal.NoticeEventPostPublished)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventPostFailed"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostFailed(out Peal.NoticeEventPostFailed? value)
    {
        if (Type == "PostFailed")
        {
            value = (Peal.NoticeEventPostFailed)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventPostUnconfirmed"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostUnconfirmed(out Peal.NoticeEventPostUnconfirmed? value)
    {
        if (Type == "PostUnconfirmed")
        {
            value = (Peal.NoticeEventPostUnconfirmed)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventPostApprovalRequested"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostApprovalRequested(out Peal.NoticeEventPostApprovalRequested? value)
    {
        if (Type == "PostApprovalRequested")
        {
            value = (Peal.NoticeEventPostApprovalRequested)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventPostApproved"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostApproved(out Peal.NoticeEventPostApproved? value)
    {
        if (Type == "PostApproved")
        {
            value = (Peal.NoticeEventPostApproved)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventPostChangesRequested"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostChangesRequested(out Peal.NoticeEventPostChangesRequested? value)
    {
        if (Type == "PostChangesRequested")
        {
            value = (Peal.NoticeEventPostChangesRequested)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventPostCommented"/> and returns true if successful.
    /// </summary>
    public bool TryAsPostCommented(out Peal.NoticeEventPostCommented? value)
    {
        if (Type == "PostCommented")
        {
            value = (Peal.NoticeEventPostCommented)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventCommentsReceived"/> and returns true if successful.
    /// </summary>
    public bool TryAsCommentsReceived(out Peal.NoticeEventCommentsReceived? value)
    {
        if (Type == "CommentsReceived")
        {
            value = (Peal.NoticeEventCommentsReceived)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventChannelReconnectRequired"/> and returns true if successful.
    /// </summary>
    public bool TryAsChannelReconnectRequired(out Peal.NoticeEventChannelReconnectRequired? value)
    {
        if (Type == "ChannelReconnectRequired")
        {
            value = (Peal.NoticeEventChannelReconnectRequired)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventChannelReconnectSoon"/> and returns true if successful.
    /// </summary>
    public bool TryAsChannelReconnectSoon(out Peal.NoticeEventChannelReconnectSoon? value)
    {
        if (Type == "ChannelReconnectSoon")
        {
            value = (Peal.NoticeEventChannelReconnectSoon)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventSubscriptionStarted"/> and returns true if successful.
    /// </summary>
    public bool TryAsSubscriptionStarted(out Peal.NoticeEventSubscriptionStarted? value)
    {
        if (Type == "SubscriptionStarted")
        {
            value = (Peal.NoticeEventSubscriptionStarted)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventTrialEnding"/> and returns true if successful.
    /// </summary>
    public bool TryAsTrialEnding(out Peal.NoticeEventTrialEnding? value)
    {
        if (Type == "TrialEnding")
        {
            value = (Peal.NoticeEventTrialEnding)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventPaymentMethodNeeded"/> and returns true if successful.
    /// </summary>
    public bool TryAsPaymentMethodNeeded(out Peal.NoticeEventPaymentMethodNeeded? value)
    {
        if (Type == "PaymentMethodNeeded")
        {
            value = (Peal.NoticeEventPaymentMethodNeeded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventAllowanceReached"/> and returns true if successful.
    /// </summary>
    public bool TryAsAllowanceReached(out Peal.NoticeEventAllowanceReached? value)
    {
        if (Type == "AllowanceReached")
        {
            value = (Peal.NoticeEventAllowanceReached)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventXSpendCeiling"/> and returns true if successful.
    /// </summary>
    public bool TryAsXSpendCeiling(out Peal.NoticeEventXSpendCeiling? value)
    {
        if (Type == "XSpendCeiling")
        {
            value = (Peal.NoticeEventXSpendCeiling)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventSubscriptionRenewing"/> and returns true if successful.
    /// </summary>
    public bool TryAsSubscriptionRenewing(out Peal.NoticeEventSubscriptionRenewing? value)
    {
        if (Type == "SubscriptionRenewing")
        {
            value = (Peal.NoticeEventSubscriptionRenewing)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventSubscriptionCancelled"/> and returns true if successful.
    /// </summary>
    public bool TryAsSubscriptionCancelled(out Peal.NoticeEventSubscriptionCancelled? value)
    {
        if (Type == "SubscriptionCancelled")
        {
            value = (Peal.NoticeEventSubscriptionCancelled)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventSubscriptionWithdrawn"/> and returns true if successful.
    /// </summary>
    public bool TryAsSubscriptionWithdrawn(out Peal.NoticeEventSubscriptionWithdrawn? value)
    {
        if (Type == "SubscriptionWithdrawn")
        {
            value = (Peal.NoticeEventSubscriptionWithdrawn)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventWebhookEndpointDisabled"/> and returns true if successful.
    /// </summary>
    public bool TryAsWebhookEndpointDisabled(out Peal.NoticeEventWebhookEndpointDisabled? value)
    {
        if (Type == "WebhookEndpointDisabled")
        {
            value = (Peal.NoticeEventWebhookEndpointDisabled)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventWebhookDeliveriesFailing"/> and returns true if successful.
    /// </summary>
    public bool TryAsWebhookDeliveriesFailing(out Peal.NoticeEventWebhookDeliveriesFailing? value)
    {
        if (Type == "WebhookDeliveriesFailing")
        {
            value = (Peal.NoticeEventWebhookDeliveriesFailing)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventAdBoostChanged"/> and returns true if successful.
    /// </summary>
    public bool TryAsAdBoostChanged(out Peal.NoticeEventAdBoostChanged? value)
    {
        if (Type == "AdBoostChanged")
        {
            value = (Peal.NoticeEventAdBoostChanged)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventAdConnectionReconnectRequired"/> and returns true if successful.
    /// </summary>
    public bool TryAsAdConnectionReconnectRequired(
        out Peal.NoticeEventAdConnectionReconnectRequired? value
    )
    {
        if (Type == "AdConnectionReconnectRequired")
        {
            value = (Peal.NoticeEventAdConnectionReconnectRequired)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventRecyclingEnded"/> and returns true if successful.
    /// </summary>
    public bool TryAsRecyclingEnded(out Peal.NoticeEventRecyclingEnded? value)
    {
        if (Type == "RecyclingEnded")
        {
            value = (Peal.NoticeEventRecyclingEnded)Value!;
            return true;
        }
        value = null;
        return false;
    }

    /// <summary>
    /// Attempts to cast the value to a <see cref="Peal.NoticeEventFeedStopped"/> and returns true if successful.
    /// </summary>
    public bool TryAsFeedStopped(out Peal.NoticeEventFeedStopped? value)
    {
        if (Type == "FeedStopped")
        {
            value = (Peal.NoticeEventFeedStopped)Value!;
            return true;
        }
        value = null;
        return false;
    }

    public override string ToString() => JsonUtils.Serialize(this);

    public static implicit operator NoticeEvent(NoticeEvent.PostPublished value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.PostFailed value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.PostUnconfirmed value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.PostApprovalRequested value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.PostApproved value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.PostChangesRequested value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.PostCommented value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.CommentsReceived value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.ChannelReconnectRequired value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.ChannelReconnectSoon value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.SubscriptionStarted value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.TrialEnding value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.PaymentMethodNeeded value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.AllowanceReached value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.XSpendCeiling value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.SubscriptionRenewing value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.SubscriptionCancelled value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.SubscriptionWithdrawn value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.WebhookEndpointDisabled value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.WebhookDeliveriesFailing value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.AdBoostChanged value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.AdConnectionReconnectRequired value) =>
        new(value);

    public static implicit operator NoticeEvent(NoticeEvent.RecyclingEnded value) => new(value);

    public static implicit operator NoticeEvent(NoticeEvent.FeedStopped value) => new(value);

    [Serializable]
    internal sealed class JsonConverter : JsonConverter<NoticeEvent>
    {
        public override bool CanConvert(global::System.Type typeToConvert) =>
            typeof(NoticeEvent).IsAssignableFrom(typeToConvert);

        public override NoticeEvent Read(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var json = JsonElement.ParseValue(ref reader);
            if (!json.TryGetProperty("_tag", out var discriminatorElement))
            {
                throw new JsonException("Missing discriminator property '_tag'");
            }
            if (discriminatorElement.ValueKind != JsonValueKind.String)
            {
                if (discriminatorElement.ValueKind == JsonValueKind.Null)
                {
                    throw new JsonException("Discriminator property '_tag' is null");
                }

                throw new JsonException(
                    $"Discriminator property '_tag' is not a string, instead is {discriminatorElement.ToString()}"
                );
            }

            var discriminator =
                discriminatorElement.GetString()
                ?? throw new JsonException("Discriminator property '_tag' is null");

            // Strip the discriminant property to prevent it from leaking into AdditionalProperties
            var jsonObject = System.Text.Json.Nodes.JsonObject.Create(json);
            jsonObject?.Remove("_tag");
            var jsonWithoutDiscriminator =
                jsonObject != null ? JsonSerializer.SerializeToElement(jsonObject, options) : json;

            var value = discriminator switch
            {
                "PostPublished" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventPostPublished?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventPostPublished"
                        ),
                "PostFailed" => jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventPostFailed?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.NoticeEventPostFailed"),
                "PostUnconfirmed" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventPostUnconfirmed?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventPostUnconfirmed"
                        ),
                "PostApprovalRequested" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventPostApprovalRequested?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventPostApprovalRequested"
                        ),
                "PostApproved" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventPostApproved?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventPostApproved"
                        ),
                "PostChangesRequested" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventPostChangesRequested?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventPostChangesRequested"
                        ),
                "PostCommented" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventPostCommented?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventPostCommented"
                        ),
                "CommentsReceived" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventCommentsReceived?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventCommentsReceived"
                        ),
                "ChannelReconnectRequired" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventChannelReconnectRequired?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventChannelReconnectRequired"
                        ),
                "ChannelReconnectSoon" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventChannelReconnectSoon?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventChannelReconnectSoon"
                        ),
                "SubscriptionStarted" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventSubscriptionStarted?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventSubscriptionStarted"
                        ),
                "TrialEnding" => jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventTrialEnding?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.NoticeEventTrialEnding"),
                "PaymentMethodNeeded" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventPaymentMethodNeeded?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventPaymentMethodNeeded"
                        ),
                "AllowanceReached" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventAllowanceReached?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventAllowanceReached"
                        ),
                "XSpendCeiling" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventXSpendCeiling?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventXSpendCeiling"
                        ),
                "SubscriptionRenewing" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventSubscriptionRenewing?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventSubscriptionRenewing"
                        ),
                "SubscriptionCancelled" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventSubscriptionCancelled?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventSubscriptionCancelled"
                        ),
                "SubscriptionWithdrawn" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventSubscriptionWithdrawn?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventSubscriptionWithdrawn"
                        ),
                "WebhookEndpointDisabled" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventWebhookEndpointDisabled?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventWebhookEndpointDisabled"
                        ),
                "WebhookDeliveriesFailing" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventWebhookDeliveriesFailing?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventWebhookDeliveriesFailing"
                        ),
                "AdBoostChanged" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventAdBoostChanged?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventAdBoostChanged"
                        ),
                "AdConnectionReconnectRequired" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventAdConnectionReconnectRequired?>(
                        options
                    )
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventAdConnectionReconnectRequired"
                        ),
                "RecyclingEnded" =>
                    jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventRecyclingEnded?>(options)
                        ?? throw new JsonException(
                            "Failed to deserialize Peal.NoticeEventRecyclingEnded"
                        ),
                "FeedStopped" => jsonWithoutDiscriminator.Deserialize<Peal.NoticeEventFeedStopped?>(
                    options
                ) ?? throw new JsonException("Failed to deserialize Peal.NoticeEventFeedStopped"),
                _ => json.Deserialize<object?>(options),
            };
            return new NoticeEvent(discriminator, value);
        }

        public override void Write(
            Utf8JsonWriter writer,
            NoticeEvent value,
            JsonSerializerOptions options
        )
        {
            JsonNode json =
                value.Type switch
                {
                    "PostPublished" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PostFailed" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PostUnconfirmed" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PostApprovalRequested" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PostApproved" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PostChangesRequested" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PostCommented" => JsonSerializer.SerializeToNode(value.Value, options),
                    "CommentsReceived" => JsonSerializer.SerializeToNode(value.Value, options),
                    "ChannelReconnectRequired" => JsonSerializer.SerializeToNode(
                        value.Value,
                        options
                    ),
                    "ChannelReconnectSoon" => JsonSerializer.SerializeToNode(value.Value, options),
                    "SubscriptionStarted" => JsonSerializer.SerializeToNode(value.Value, options),
                    "TrialEnding" => JsonSerializer.SerializeToNode(value.Value, options),
                    "PaymentMethodNeeded" => JsonSerializer.SerializeToNode(value.Value, options),
                    "AllowanceReached" => JsonSerializer.SerializeToNode(value.Value, options),
                    "XSpendCeiling" => JsonSerializer.SerializeToNode(value.Value, options),
                    "SubscriptionRenewing" => JsonSerializer.SerializeToNode(value.Value, options),
                    "SubscriptionCancelled" => JsonSerializer.SerializeToNode(value.Value, options),
                    "SubscriptionWithdrawn" => JsonSerializer.SerializeToNode(value.Value, options),
                    "WebhookEndpointDisabled" => JsonSerializer.SerializeToNode(
                        value.Value,
                        options
                    ),
                    "WebhookDeliveriesFailing" => JsonSerializer.SerializeToNode(
                        value.Value,
                        options
                    ),
                    "AdBoostChanged" => JsonSerializer.SerializeToNode(value.Value, options),
                    "AdConnectionReconnectRequired" => JsonSerializer.SerializeToNode(
                        value.Value,
                        options
                    ),
                    "RecyclingEnded" => JsonSerializer.SerializeToNode(value.Value, options),
                    "FeedStopped" => JsonSerializer.SerializeToNode(value.Value, options),
                    _ => JsonSerializer.SerializeToNode(value.Value, options),
                } ?? new JsonObject();
            json["_tag"] = value.Type;
            json.WriteTo(writer, options);
        }

        public override NoticeEvent ReadAsPropertyName(
            ref Utf8JsonReader reader,
            global::System.Type typeToConvert,
            JsonSerializerOptions options
        )
        {
            var stringValue =
                reader.GetString()
                ?? throw new JsonException("The JSON property name could not be read as a string.");
            return new NoticeEvent(stringValue, stringValue);
        }

        public override void WriteAsPropertyName(
            Utf8JsonWriter writer,
            NoticeEvent value,
            JsonSerializerOptions options
        )
        {
            writer.WritePropertyName(value.Type);
        }
    }

    /// <summary>
    /// Discriminated union type for PostPublished
    /// </summary>
    [Serializable]
    public struct PostPublished
    {
        public PostPublished(Peal.NoticeEventPostPublished value)
        {
            Value = value;
        }

        internal Peal.NoticeEventPostPublished Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.PostPublished(
            Peal.NoticeEventPostPublished value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for PostFailed
    /// </summary>
    [Serializable]
    public struct PostFailed
    {
        public PostFailed(Peal.NoticeEventPostFailed value)
        {
            Value = value;
        }

        internal Peal.NoticeEventPostFailed Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.PostFailed(Peal.NoticeEventPostFailed value) =>
            new(value);
    }

    /// <summary>
    /// Discriminated union type for PostUnconfirmed
    /// </summary>
    [Serializable]
    public struct PostUnconfirmed
    {
        public PostUnconfirmed(Peal.NoticeEventPostUnconfirmed value)
        {
            Value = value;
        }

        internal Peal.NoticeEventPostUnconfirmed Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.PostUnconfirmed(
            Peal.NoticeEventPostUnconfirmed value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for PostApprovalRequested
    /// </summary>
    [Serializable]
    public struct PostApprovalRequested
    {
        public PostApprovalRequested(Peal.NoticeEventPostApprovalRequested value)
        {
            Value = value;
        }

        internal Peal.NoticeEventPostApprovalRequested Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.PostApprovalRequested(
            Peal.NoticeEventPostApprovalRequested value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for PostApproved
    /// </summary>
    [Serializable]
    public struct PostApproved
    {
        public PostApproved(Peal.NoticeEventPostApproved value)
        {
            Value = value;
        }

        internal Peal.NoticeEventPostApproved Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.PostApproved(
            Peal.NoticeEventPostApproved value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for PostChangesRequested
    /// </summary>
    [Serializable]
    public struct PostChangesRequested
    {
        public PostChangesRequested(Peal.NoticeEventPostChangesRequested value)
        {
            Value = value;
        }

        internal Peal.NoticeEventPostChangesRequested Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.PostChangesRequested(
            Peal.NoticeEventPostChangesRequested value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for PostCommented
    /// </summary>
    [Serializable]
    public struct PostCommented
    {
        public PostCommented(Peal.NoticeEventPostCommented value)
        {
            Value = value;
        }

        internal Peal.NoticeEventPostCommented Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.PostCommented(
            Peal.NoticeEventPostCommented value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for CommentsReceived
    /// </summary>
    [Serializable]
    public struct CommentsReceived
    {
        public CommentsReceived(Peal.NoticeEventCommentsReceived value)
        {
            Value = value;
        }

        internal Peal.NoticeEventCommentsReceived Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.CommentsReceived(
            Peal.NoticeEventCommentsReceived value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for ChannelReconnectRequired
    /// </summary>
    [Serializable]
    public struct ChannelReconnectRequired
    {
        public ChannelReconnectRequired(Peal.NoticeEventChannelReconnectRequired value)
        {
            Value = value;
        }

        internal Peal.NoticeEventChannelReconnectRequired Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.ChannelReconnectRequired(
            Peal.NoticeEventChannelReconnectRequired value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for ChannelReconnectSoon
    /// </summary>
    [Serializable]
    public struct ChannelReconnectSoon
    {
        public ChannelReconnectSoon(Peal.NoticeEventChannelReconnectSoon value)
        {
            Value = value;
        }

        internal Peal.NoticeEventChannelReconnectSoon Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.ChannelReconnectSoon(
            Peal.NoticeEventChannelReconnectSoon value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for SubscriptionStarted
    /// </summary>
    [Serializable]
    public struct SubscriptionStarted
    {
        public SubscriptionStarted(Peal.NoticeEventSubscriptionStarted value)
        {
            Value = value;
        }

        internal Peal.NoticeEventSubscriptionStarted Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.SubscriptionStarted(
            Peal.NoticeEventSubscriptionStarted value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for TrialEnding
    /// </summary>
    [Serializable]
    public struct TrialEnding
    {
        public TrialEnding(Peal.NoticeEventTrialEnding value)
        {
            Value = value;
        }

        internal Peal.NoticeEventTrialEnding Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.TrialEnding(
            Peal.NoticeEventTrialEnding value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for PaymentMethodNeeded
    /// </summary>
    [Serializable]
    public struct PaymentMethodNeeded
    {
        public PaymentMethodNeeded(Peal.NoticeEventPaymentMethodNeeded value)
        {
            Value = value;
        }

        internal Peal.NoticeEventPaymentMethodNeeded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.PaymentMethodNeeded(
            Peal.NoticeEventPaymentMethodNeeded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for AllowanceReached
    /// </summary>
    [Serializable]
    public struct AllowanceReached
    {
        public AllowanceReached(Peal.NoticeEventAllowanceReached value)
        {
            Value = value;
        }

        internal Peal.NoticeEventAllowanceReached Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.AllowanceReached(
            Peal.NoticeEventAllowanceReached value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for XSpendCeiling
    /// </summary>
    [Serializable]
    public struct XSpendCeiling
    {
        public XSpendCeiling(Peal.NoticeEventXSpendCeiling value)
        {
            Value = value;
        }

        internal Peal.NoticeEventXSpendCeiling Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.XSpendCeiling(
            Peal.NoticeEventXSpendCeiling value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for SubscriptionRenewing
    /// </summary>
    [Serializable]
    public struct SubscriptionRenewing
    {
        public SubscriptionRenewing(Peal.NoticeEventSubscriptionRenewing value)
        {
            Value = value;
        }

        internal Peal.NoticeEventSubscriptionRenewing Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.SubscriptionRenewing(
            Peal.NoticeEventSubscriptionRenewing value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for SubscriptionCancelled
    /// </summary>
    [Serializable]
    public struct SubscriptionCancelled
    {
        public SubscriptionCancelled(Peal.NoticeEventSubscriptionCancelled value)
        {
            Value = value;
        }

        internal Peal.NoticeEventSubscriptionCancelled Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.SubscriptionCancelled(
            Peal.NoticeEventSubscriptionCancelled value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for SubscriptionWithdrawn
    /// </summary>
    [Serializable]
    public struct SubscriptionWithdrawn
    {
        public SubscriptionWithdrawn(Peal.NoticeEventSubscriptionWithdrawn value)
        {
            Value = value;
        }

        internal Peal.NoticeEventSubscriptionWithdrawn Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.SubscriptionWithdrawn(
            Peal.NoticeEventSubscriptionWithdrawn value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for WebhookEndpointDisabled
    /// </summary>
    [Serializable]
    public struct WebhookEndpointDisabled
    {
        public WebhookEndpointDisabled(Peal.NoticeEventWebhookEndpointDisabled value)
        {
            Value = value;
        }

        internal Peal.NoticeEventWebhookEndpointDisabled Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.WebhookEndpointDisabled(
            Peal.NoticeEventWebhookEndpointDisabled value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for WebhookDeliveriesFailing
    /// </summary>
    [Serializable]
    public struct WebhookDeliveriesFailing
    {
        public WebhookDeliveriesFailing(Peal.NoticeEventWebhookDeliveriesFailing value)
        {
            Value = value;
        }

        internal Peal.NoticeEventWebhookDeliveriesFailing Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.WebhookDeliveriesFailing(
            Peal.NoticeEventWebhookDeliveriesFailing value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for AdBoostChanged
    /// </summary>
    [Serializable]
    public struct AdBoostChanged
    {
        public AdBoostChanged(Peal.NoticeEventAdBoostChanged value)
        {
            Value = value;
        }

        internal Peal.NoticeEventAdBoostChanged Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.AdBoostChanged(
            Peal.NoticeEventAdBoostChanged value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for AdConnectionReconnectRequired
    /// </summary>
    [Serializable]
    public struct AdConnectionReconnectRequired
    {
        public AdConnectionReconnectRequired(Peal.NoticeEventAdConnectionReconnectRequired value)
        {
            Value = value;
        }

        internal Peal.NoticeEventAdConnectionReconnectRequired Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.AdConnectionReconnectRequired(
            Peal.NoticeEventAdConnectionReconnectRequired value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for RecyclingEnded
    /// </summary>
    [Serializable]
    public struct RecyclingEnded
    {
        public RecyclingEnded(Peal.NoticeEventRecyclingEnded value)
        {
            Value = value;
        }

        internal Peal.NoticeEventRecyclingEnded Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.RecyclingEnded(
            Peal.NoticeEventRecyclingEnded value
        ) => new(value);
    }

    /// <summary>
    /// Discriminated union type for FeedStopped
    /// </summary>
    [Serializable]
    public struct FeedStopped
    {
        public FeedStopped(Peal.NoticeEventFeedStopped value)
        {
            Value = value;
        }

        internal Peal.NoticeEventFeedStopped Value { get; set; }

        public override string ToString() => Value.ToString() ?? "null";

        public static implicit operator NoticeEvent.FeedStopped(
            Peal.NoticeEventFeedStopped value
        ) => new(value);
    }
}
