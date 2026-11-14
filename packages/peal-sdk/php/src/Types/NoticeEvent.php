<?php

namespace Peal\Types;

use Peal\Core\Json\JsonSerializableType;
use Exception;

class NoticeEvent extends JsonSerializableType
{
    /**
     * @var (
     *    'PostPublished'
     *   |'PostFailed'
     *   |'PostUnconfirmed'
     *   |'PostApprovalRequested'
     *   |'PostApproved'
     *   |'PostChangesRequested'
     *   |'PostCommented'
     *   |'CommentsReceived'
     *   |'ChannelReconnectRequired'
     *   |'ChannelReconnectSoon'
     *   |'SubscriptionStarted'
     *   |'TrialEnding'
     *   |'PaymentMethodNeeded'
     *   |'AllowanceReached'
     *   |'XSpendCeiling'
     *   |'SubscriptionRenewing'
     *   |'SubscriptionCancelled'
     *   |'SubscriptionWithdrawn'
     *   |'WebhookEndpointDisabled'
     *   |'WebhookDeliveriesFailing'
     *   |'AdBoostChanged'
     *   |'AdConnectionReconnectRequired'
     *   |'RecyclingEnded'
     *   |'FeedStopped'
     *   |'_unknown'
     * ) $type
     */
    public readonly string $type;

    /**
     * @var (
     *    NoticeEventPostPublished
     *   |NoticeEventPostFailed
     *   |NoticeEventPostUnconfirmed
     *   |NoticeEventPostApprovalRequested
     *   |NoticeEventPostApproved
     *   |NoticeEventPostChangesRequested
     *   |NoticeEventPostCommented
     *   |NoticeEventCommentsReceived
     *   |NoticeEventChannelReconnectRequired
     *   |NoticeEventChannelReconnectSoon
     *   |NoticeEventSubscriptionStarted
     *   |NoticeEventTrialEnding
     *   |NoticeEventPaymentMethodNeeded
     *   |NoticeEventAllowanceReached
     *   |NoticeEventXSpendCeiling
     *   |NoticeEventSubscriptionRenewing
     *   |NoticeEventSubscriptionCancelled
     *   |NoticeEventSubscriptionWithdrawn
     *   |NoticeEventWebhookEndpointDisabled
     *   |NoticeEventWebhookDeliveriesFailing
     *   |NoticeEventAdBoostChanged
     *   |NoticeEventAdConnectionReconnectRequired
     *   |NoticeEventRecyclingEnded
     *   |NoticeEventFeedStopped
     *   |mixed
     * ) $value
     */
    public readonly mixed $value;

    /**
     * @param array{
     *   type: (
     *    'PostPublished'
     *   |'PostFailed'
     *   |'PostUnconfirmed'
     *   |'PostApprovalRequested'
     *   |'PostApproved'
     *   |'PostChangesRequested'
     *   |'PostCommented'
     *   |'CommentsReceived'
     *   |'ChannelReconnectRequired'
     *   |'ChannelReconnectSoon'
     *   |'SubscriptionStarted'
     *   |'TrialEnding'
     *   |'PaymentMethodNeeded'
     *   |'AllowanceReached'
     *   |'XSpendCeiling'
     *   |'SubscriptionRenewing'
     *   |'SubscriptionCancelled'
     *   |'SubscriptionWithdrawn'
     *   |'WebhookEndpointDisabled'
     *   |'WebhookDeliveriesFailing'
     *   |'AdBoostChanged'
     *   |'AdConnectionReconnectRequired'
     *   |'RecyclingEnded'
     *   |'FeedStopped'
     *   |'_unknown'
     * ),
     *   value: (
     *    NoticeEventPostPublished
     *   |NoticeEventPostFailed
     *   |NoticeEventPostUnconfirmed
     *   |NoticeEventPostApprovalRequested
     *   |NoticeEventPostApproved
     *   |NoticeEventPostChangesRequested
     *   |NoticeEventPostCommented
     *   |NoticeEventCommentsReceived
     *   |NoticeEventChannelReconnectRequired
     *   |NoticeEventChannelReconnectSoon
     *   |NoticeEventSubscriptionStarted
     *   |NoticeEventTrialEnding
     *   |NoticeEventPaymentMethodNeeded
     *   |NoticeEventAllowanceReached
     *   |NoticeEventXSpendCeiling
     *   |NoticeEventSubscriptionRenewing
     *   |NoticeEventSubscriptionCancelled
     *   |NoticeEventSubscriptionWithdrawn
     *   |NoticeEventWebhookEndpointDisabled
     *   |NoticeEventWebhookDeliveriesFailing
     *   |NoticeEventAdBoostChanged
     *   |NoticeEventAdConnectionReconnectRequired
     *   |NoticeEventRecyclingEnded
     *   |NoticeEventFeedStopped
     *   |mixed
     * ),
     * } $values
     */
    private function __construct(
        array $values,
    ) {
        $this->type = $values['type'];
        $this->value = $values['value'];
    }

    /**
     * @param NoticeEventPostPublished $postPublished
     * @return NoticeEvent
     */
    public static function postPublished(NoticeEventPostPublished $postPublished): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'PostPublished',
            'value' => $postPublished,
        ]);
    }

    /**
     * @param NoticeEventPostFailed $postFailed
     * @return NoticeEvent
     */
    public static function postFailed(NoticeEventPostFailed $postFailed): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'PostFailed',
            'value' => $postFailed,
        ]);
    }

    /**
     * @param NoticeEventPostUnconfirmed $postUnconfirmed
     * @return NoticeEvent
     */
    public static function postUnconfirmed(NoticeEventPostUnconfirmed $postUnconfirmed): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'PostUnconfirmed',
            'value' => $postUnconfirmed,
        ]);
    }

    /**
     * @param NoticeEventPostApprovalRequested $postApprovalRequested
     * @return NoticeEvent
     */
    public static function postApprovalRequested(NoticeEventPostApprovalRequested $postApprovalRequested): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'PostApprovalRequested',
            'value' => $postApprovalRequested,
        ]);
    }

    /**
     * @param NoticeEventPostApproved $postApproved
     * @return NoticeEvent
     */
    public static function postApproved(NoticeEventPostApproved $postApproved): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'PostApproved',
            'value' => $postApproved,
        ]);
    }

    /**
     * @param NoticeEventPostChangesRequested $postChangesRequested
     * @return NoticeEvent
     */
    public static function postChangesRequested(NoticeEventPostChangesRequested $postChangesRequested): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'PostChangesRequested',
            'value' => $postChangesRequested,
        ]);
    }

    /**
     * @param NoticeEventPostCommented $postCommented
     * @return NoticeEvent
     */
    public static function postCommented(NoticeEventPostCommented $postCommented): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'PostCommented',
            'value' => $postCommented,
        ]);
    }

    /**
     * @param NoticeEventCommentsReceived $commentsReceived
     * @return NoticeEvent
     */
    public static function commentsReceived(NoticeEventCommentsReceived $commentsReceived): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'CommentsReceived',
            'value' => $commentsReceived,
        ]);
    }

    /**
     * @param NoticeEventChannelReconnectRequired $channelReconnectRequired
     * @return NoticeEvent
     */
    public static function channelReconnectRequired(NoticeEventChannelReconnectRequired $channelReconnectRequired): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'ChannelReconnectRequired',
            'value' => $channelReconnectRequired,
        ]);
    }

    /**
     * @param NoticeEventChannelReconnectSoon $channelReconnectSoon
     * @return NoticeEvent
     */
    public static function channelReconnectSoon(NoticeEventChannelReconnectSoon $channelReconnectSoon): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'ChannelReconnectSoon',
            'value' => $channelReconnectSoon,
        ]);
    }

    /**
     * @param NoticeEventSubscriptionStarted $subscriptionStarted
     * @return NoticeEvent
     */
    public static function subscriptionStarted(NoticeEventSubscriptionStarted $subscriptionStarted): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'SubscriptionStarted',
            'value' => $subscriptionStarted,
        ]);
    }

    /**
     * @param NoticeEventTrialEnding $trialEnding
     * @return NoticeEvent
     */
    public static function trialEnding(NoticeEventTrialEnding $trialEnding): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'TrialEnding',
            'value' => $trialEnding,
        ]);
    }

    /**
     * @param NoticeEventPaymentMethodNeeded $paymentMethodNeeded
     * @return NoticeEvent
     */
    public static function paymentMethodNeeded(NoticeEventPaymentMethodNeeded $paymentMethodNeeded): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'PaymentMethodNeeded',
            'value' => $paymentMethodNeeded,
        ]);
    }

    /**
     * @param NoticeEventAllowanceReached $allowanceReached
     * @return NoticeEvent
     */
    public static function allowanceReached(NoticeEventAllowanceReached $allowanceReached): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'AllowanceReached',
            'value' => $allowanceReached,
        ]);
    }

    /**
     * @param NoticeEventXSpendCeiling $xSpendCeiling
     * @return NoticeEvent
     */
    public static function xSpendCeiling(NoticeEventXSpendCeiling $xSpendCeiling): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'XSpendCeiling',
            'value' => $xSpendCeiling,
        ]);
    }

    /**
     * @param NoticeEventSubscriptionRenewing $subscriptionRenewing
     * @return NoticeEvent
     */
    public static function subscriptionRenewing(NoticeEventSubscriptionRenewing $subscriptionRenewing): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'SubscriptionRenewing',
            'value' => $subscriptionRenewing,
        ]);
    }

    /**
     * @param NoticeEventSubscriptionCancelled $subscriptionCancelled
     * @return NoticeEvent
     */
    public static function subscriptionCancelled(NoticeEventSubscriptionCancelled $subscriptionCancelled): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'SubscriptionCancelled',
            'value' => $subscriptionCancelled,
        ]);
    }

    /**
     * @param NoticeEventSubscriptionWithdrawn $subscriptionWithdrawn
     * @return NoticeEvent
     */
    public static function subscriptionWithdrawn(NoticeEventSubscriptionWithdrawn $subscriptionWithdrawn): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'SubscriptionWithdrawn',
            'value' => $subscriptionWithdrawn,
        ]);
    }

    /**
     * @param NoticeEventWebhookEndpointDisabled $webhookEndpointDisabled
     * @return NoticeEvent
     */
    public static function webhookEndpointDisabled(NoticeEventWebhookEndpointDisabled $webhookEndpointDisabled): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'WebhookEndpointDisabled',
            'value' => $webhookEndpointDisabled,
        ]);
    }

    /**
     * @param NoticeEventWebhookDeliveriesFailing $webhookDeliveriesFailing
     * @return NoticeEvent
     */
    public static function webhookDeliveriesFailing(NoticeEventWebhookDeliveriesFailing $webhookDeliveriesFailing): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'WebhookDeliveriesFailing',
            'value' => $webhookDeliveriesFailing,
        ]);
    }

    /**
     * @param NoticeEventAdBoostChanged $adBoostChanged
     * @return NoticeEvent
     */
    public static function adBoostChanged(NoticeEventAdBoostChanged $adBoostChanged): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'AdBoostChanged',
            'value' => $adBoostChanged,
        ]);
    }

    /**
     * @param NoticeEventAdConnectionReconnectRequired $adConnectionReconnectRequired
     * @return NoticeEvent
     */
    public static function adConnectionReconnectRequired(NoticeEventAdConnectionReconnectRequired $adConnectionReconnectRequired): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'AdConnectionReconnectRequired',
            'value' => $adConnectionReconnectRequired,
        ]);
    }

    /**
     * @param NoticeEventRecyclingEnded $recyclingEnded
     * @return NoticeEvent
     */
    public static function recyclingEnded(NoticeEventRecyclingEnded $recyclingEnded): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'RecyclingEnded',
            'value' => $recyclingEnded,
        ]);
    }

    /**
     * @param NoticeEventFeedStopped $feedStopped
     * @return NoticeEvent
     */
    public static function feedStopped(NoticeEventFeedStopped $feedStopped): NoticeEvent
    {
        return new NoticeEvent([
            'type' => 'FeedStopped',
            'value' => $feedStopped,
        ]);
    }

    /**
     * @return bool
     */
    public function isPostPublished(): bool
    {
        return $this->value instanceof NoticeEventPostPublished && $this->type === 'PostPublished';
    }

    /**
     * @return NoticeEventPostPublished
     */
    public function asPostPublished(): NoticeEventPostPublished
    {
        if (!($this->value instanceof NoticeEventPostPublished && $this->type === 'PostPublished')) {
            throw new Exception(
                "Expected PostPublished; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPostFailed(): bool
    {
        return $this->value instanceof NoticeEventPostFailed && $this->type === 'PostFailed';
    }

    /**
     * @return NoticeEventPostFailed
     */
    public function asPostFailed(): NoticeEventPostFailed
    {
        if (!($this->value instanceof NoticeEventPostFailed && $this->type === 'PostFailed')) {
            throw new Exception(
                "Expected PostFailed; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPostUnconfirmed(): bool
    {
        return $this->value instanceof NoticeEventPostUnconfirmed && $this->type === 'PostUnconfirmed';
    }

    /**
     * @return NoticeEventPostUnconfirmed
     */
    public function asPostUnconfirmed(): NoticeEventPostUnconfirmed
    {
        if (!($this->value instanceof NoticeEventPostUnconfirmed && $this->type === 'PostUnconfirmed')) {
            throw new Exception(
                "Expected PostUnconfirmed; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPostApprovalRequested(): bool
    {
        return $this->value instanceof NoticeEventPostApprovalRequested && $this->type === 'PostApprovalRequested';
    }

    /**
     * @return NoticeEventPostApprovalRequested
     */
    public function asPostApprovalRequested(): NoticeEventPostApprovalRequested
    {
        if (!($this->value instanceof NoticeEventPostApprovalRequested && $this->type === 'PostApprovalRequested')) {
            throw new Exception(
                "Expected PostApprovalRequested; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPostApproved(): bool
    {
        return $this->value instanceof NoticeEventPostApproved && $this->type === 'PostApproved';
    }

    /**
     * @return NoticeEventPostApproved
     */
    public function asPostApproved(): NoticeEventPostApproved
    {
        if (!($this->value instanceof NoticeEventPostApproved && $this->type === 'PostApproved')) {
            throw new Exception(
                "Expected PostApproved; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPostChangesRequested(): bool
    {
        return $this->value instanceof NoticeEventPostChangesRequested && $this->type === 'PostChangesRequested';
    }

    /**
     * @return NoticeEventPostChangesRequested
     */
    public function asPostChangesRequested(): NoticeEventPostChangesRequested
    {
        if (!($this->value instanceof NoticeEventPostChangesRequested && $this->type === 'PostChangesRequested')) {
            throw new Exception(
                "Expected PostChangesRequested; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPostCommented(): bool
    {
        return $this->value instanceof NoticeEventPostCommented && $this->type === 'PostCommented';
    }

    /**
     * @return NoticeEventPostCommented
     */
    public function asPostCommented(): NoticeEventPostCommented
    {
        if (!($this->value instanceof NoticeEventPostCommented && $this->type === 'PostCommented')) {
            throw new Exception(
                "Expected PostCommented; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isCommentsReceived(): bool
    {
        return $this->value instanceof NoticeEventCommentsReceived && $this->type === 'CommentsReceived';
    }

    /**
     * @return NoticeEventCommentsReceived
     */
    public function asCommentsReceived(): NoticeEventCommentsReceived
    {
        if (!($this->value instanceof NoticeEventCommentsReceived && $this->type === 'CommentsReceived')) {
            throw new Exception(
                "Expected CommentsReceived; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isChannelReconnectRequired(): bool
    {
        return $this->value instanceof NoticeEventChannelReconnectRequired && $this->type === 'ChannelReconnectRequired';
    }

    /**
     * @return NoticeEventChannelReconnectRequired
     */
    public function asChannelReconnectRequired(): NoticeEventChannelReconnectRequired
    {
        if (!($this->value instanceof NoticeEventChannelReconnectRequired && $this->type === 'ChannelReconnectRequired')) {
            throw new Exception(
                "Expected ChannelReconnectRequired; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isChannelReconnectSoon(): bool
    {
        return $this->value instanceof NoticeEventChannelReconnectSoon && $this->type === 'ChannelReconnectSoon';
    }

    /**
     * @return NoticeEventChannelReconnectSoon
     */
    public function asChannelReconnectSoon(): NoticeEventChannelReconnectSoon
    {
        if (!($this->value instanceof NoticeEventChannelReconnectSoon && $this->type === 'ChannelReconnectSoon')) {
            throw new Exception(
                "Expected ChannelReconnectSoon; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isSubscriptionStarted(): bool
    {
        return $this->value instanceof NoticeEventSubscriptionStarted && $this->type === 'SubscriptionStarted';
    }

    /**
     * @return NoticeEventSubscriptionStarted
     */
    public function asSubscriptionStarted(): NoticeEventSubscriptionStarted
    {
        if (!($this->value instanceof NoticeEventSubscriptionStarted && $this->type === 'SubscriptionStarted')) {
            throw new Exception(
                "Expected SubscriptionStarted; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isTrialEnding(): bool
    {
        return $this->value instanceof NoticeEventTrialEnding && $this->type === 'TrialEnding';
    }

    /**
     * @return NoticeEventTrialEnding
     */
    public function asTrialEnding(): NoticeEventTrialEnding
    {
        if (!($this->value instanceof NoticeEventTrialEnding && $this->type === 'TrialEnding')) {
            throw new Exception(
                "Expected TrialEnding; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isPaymentMethodNeeded(): bool
    {
        return $this->value instanceof NoticeEventPaymentMethodNeeded && $this->type === 'PaymentMethodNeeded';
    }

    /**
     * @return NoticeEventPaymentMethodNeeded
     */
    public function asPaymentMethodNeeded(): NoticeEventPaymentMethodNeeded
    {
        if (!($this->value instanceof NoticeEventPaymentMethodNeeded && $this->type === 'PaymentMethodNeeded')) {
            throw new Exception(
                "Expected PaymentMethodNeeded; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isAllowanceReached(): bool
    {
        return $this->value instanceof NoticeEventAllowanceReached && $this->type === 'AllowanceReached';
    }

    /**
     * @return NoticeEventAllowanceReached
     */
    public function asAllowanceReached(): NoticeEventAllowanceReached
    {
        if (!($this->value instanceof NoticeEventAllowanceReached && $this->type === 'AllowanceReached')) {
            throw new Exception(
                "Expected AllowanceReached; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isXSpendCeiling(): bool
    {
        return $this->value instanceof NoticeEventXSpendCeiling && $this->type === 'XSpendCeiling';
    }

    /**
     * @return NoticeEventXSpendCeiling
     */
    public function asXSpendCeiling(): NoticeEventXSpendCeiling
    {
        if (!($this->value instanceof NoticeEventXSpendCeiling && $this->type === 'XSpendCeiling')) {
            throw new Exception(
                "Expected XSpendCeiling; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isSubscriptionRenewing(): bool
    {
        return $this->value instanceof NoticeEventSubscriptionRenewing && $this->type === 'SubscriptionRenewing';
    }

    /**
     * @return NoticeEventSubscriptionRenewing
     */
    public function asSubscriptionRenewing(): NoticeEventSubscriptionRenewing
    {
        if (!($this->value instanceof NoticeEventSubscriptionRenewing && $this->type === 'SubscriptionRenewing')) {
            throw new Exception(
                "Expected SubscriptionRenewing; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isSubscriptionCancelled(): bool
    {
        return $this->value instanceof NoticeEventSubscriptionCancelled && $this->type === 'SubscriptionCancelled';
    }

    /**
     * @return NoticeEventSubscriptionCancelled
     */
    public function asSubscriptionCancelled(): NoticeEventSubscriptionCancelled
    {
        if (!($this->value instanceof NoticeEventSubscriptionCancelled && $this->type === 'SubscriptionCancelled')) {
            throw new Exception(
                "Expected SubscriptionCancelled; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isSubscriptionWithdrawn(): bool
    {
        return $this->value instanceof NoticeEventSubscriptionWithdrawn && $this->type === 'SubscriptionWithdrawn';
    }

    /**
     * @return NoticeEventSubscriptionWithdrawn
     */
    public function asSubscriptionWithdrawn(): NoticeEventSubscriptionWithdrawn
    {
        if (!($this->value instanceof NoticeEventSubscriptionWithdrawn && $this->type === 'SubscriptionWithdrawn')) {
            throw new Exception(
                "Expected SubscriptionWithdrawn; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isWebhookEndpointDisabled(): bool
    {
        return $this->value instanceof NoticeEventWebhookEndpointDisabled && $this->type === 'WebhookEndpointDisabled';
    }

    /**
     * @return NoticeEventWebhookEndpointDisabled
     */
    public function asWebhookEndpointDisabled(): NoticeEventWebhookEndpointDisabled
    {
        if (!($this->value instanceof NoticeEventWebhookEndpointDisabled && $this->type === 'WebhookEndpointDisabled')) {
            throw new Exception(
                "Expected WebhookEndpointDisabled; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isWebhookDeliveriesFailing(): bool
    {
        return $this->value instanceof NoticeEventWebhookDeliveriesFailing && $this->type === 'WebhookDeliveriesFailing';
    }

    /**
     * @return NoticeEventWebhookDeliveriesFailing
     */
    public function asWebhookDeliveriesFailing(): NoticeEventWebhookDeliveriesFailing
    {
        if (!($this->value instanceof NoticeEventWebhookDeliveriesFailing && $this->type === 'WebhookDeliveriesFailing')) {
            throw new Exception(
                "Expected WebhookDeliveriesFailing; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isAdBoostChanged(): bool
    {
        return $this->value instanceof NoticeEventAdBoostChanged && $this->type === 'AdBoostChanged';
    }

    /**
     * @return NoticeEventAdBoostChanged
     */
    public function asAdBoostChanged(): NoticeEventAdBoostChanged
    {
        if (!($this->value instanceof NoticeEventAdBoostChanged && $this->type === 'AdBoostChanged')) {
            throw new Exception(
                "Expected AdBoostChanged; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isAdConnectionReconnectRequired(): bool
    {
        return $this->value instanceof NoticeEventAdConnectionReconnectRequired && $this->type === 'AdConnectionReconnectRequired';
    }

    /**
     * @return NoticeEventAdConnectionReconnectRequired
     */
    public function asAdConnectionReconnectRequired(): NoticeEventAdConnectionReconnectRequired
    {
        if (!($this->value instanceof NoticeEventAdConnectionReconnectRequired && $this->type === 'AdConnectionReconnectRequired')) {
            throw new Exception(
                "Expected AdConnectionReconnectRequired; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isRecyclingEnded(): bool
    {
        return $this->value instanceof NoticeEventRecyclingEnded && $this->type === 'RecyclingEnded';
    }

    /**
     * @return NoticeEventRecyclingEnded
     */
    public function asRecyclingEnded(): NoticeEventRecyclingEnded
    {
        if (!($this->value instanceof NoticeEventRecyclingEnded && $this->type === 'RecyclingEnded')) {
            throw new Exception(
                "Expected RecyclingEnded; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return bool
     */
    public function isFeedStopped(): bool
    {
        return $this->value instanceof NoticeEventFeedStopped && $this->type === 'FeedStopped';
    }

    /**
     * @return NoticeEventFeedStopped
     */
    public function asFeedStopped(): NoticeEventFeedStopped
    {
        if (!($this->value instanceof NoticeEventFeedStopped && $this->type === 'FeedStopped')) {
            throw new Exception(
                "Expected FeedStopped; got " . $this->type . " with value of type " . get_debug_type($this->value),
            );
        }

        return $this->value;
    }

    /**
     * @return string
     */
    public function __toString(): string
    {
        return $this->toJson();
    }

    /**
     * @return array<mixed>
     */
    public function jsonSerialize(): array
    {
        $result = [];
        $result['_tag'] = $this->type;

        $base = parent::jsonSerialize();
        $result = array_merge($base, $result);

        switch ($this->type) {
            case 'PostPublished':
                $value = $this->asPostPublished()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'PostFailed':
                $value = $this->asPostFailed()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'PostUnconfirmed':
                $value = $this->asPostUnconfirmed()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'PostApprovalRequested':
                $value = $this->asPostApprovalRequested()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'PostApproved':
                $value = $this->asPostApproved()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'PostChangesRequested':
                $value = $this->asPostChangesRequested()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'PostCommented':
                $value = $this->asPostCommented()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'CommentsReceived':
                $value = $this->asCommentsReceived()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'ChannelReconnectRequired':
                $value = $this->asChannelReconnectRequired()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'ChannelReconnectSoon':
                $value = $this->asChannelReconnectSoon()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'SubscriptionStarted':
                $value = $this->asSubscriptionStarted()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'TrialEnding':
                $value = $this->asTrialEnding()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'PaymentMethodNeeded':
                $value = $this->asPaymentMethodNeeded()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'AllowanceReached':
                $value = $this->asAllowanceReached()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'XSpendCeiling':
                $value = $this->asXSpendCeiling()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'SubscriptionRenewing':
                $value = $this->asSubscriptionRenewing()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'SubscriptionCancelled':
                $value = $this->asSubscriptionCancelled()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'SubscriptionWithdrawn':
                $value = $this->asSubscriptionWithdrawn()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'WebhookEndpointDisabled':
                $value = $this->asWebhookEndpointDisabled()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'WebhookDeliveriesFailing':
                $value = $this->asWebhookDeliveriesFailing()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'AdBoostChanged':
                $value = $this->asAdBoostChanged()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'AdConnectionReconnectRequired':
                $value = $this->asAdConnectionReconnectRequired()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'RecyclingEnded':
                $value = $this->asRecyclingEnded()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case 'FeedStopped':
                $value = $this->asFeedStopped()->jsonSerialize();
                $result = array_merge($value, $result);
                break;
            case '_unknown':
            default:
                if (is_null($this->value)) {
                    break;
                }
                if ($this->value instanceof JsonSerializableType) {
                    $value = $this->value->jsonSerialize();
                    $result = array_merge($value, $result);
                } elseif (is_array($this->value)) {
                    $result = array_merge($this->value, $result);
                }
        }

        return $result;
    }

    /**
     * @param array<string, mixed> $data
     */
    public static function jsonDeserialize(array $data): static
    {
        $args = [];
        if (!array_key_exists('_tag', $data)) {
            throw new Exception(
                "JSON data is missing property '_tag'",
            );
        }
        $type = $data['_tag'];
        if (!(is_string($type))) {
            throw new Exception(
                "Expected property 'type' in JSON data to be string, instead received " . get_debug_type($data['_tag']),
            );
        }

        $args['type'] = $type;
        switch ($type) {
            case 'PostPublished':
                $args['value'] = NoticeEventPostPublished::jsonDeserialize($data);
                break;
            case 'PostFailed':
                $args['value'] = NoticeEventPostFailed::jsonDeserialize($data);
                break;
            case 'PostUnconfirmed':
                $args['value'] = NoticeEventPostUnconfirmed::jsonDeserialize($data);
                break;
            case 'PostApprovalRequested':
                $args['value'] = NoticeEventPostApprovalRequested::jsonDeserialize($data);
                break;
            case 'PostApproved':
                $args['value'] = NoticeEventPostApproved::jsonDeserialize($data);
                break;
            case 'PostChangesRequested':
                $args['value'] = NoticeEventPostChangesRequested::jsonDeserialize($data);
                break;
            case 'PostCommented':
                $args['value'] = NoticeEventPostCommented::jsonDeserialize($data);
                break;
            case 'CommentsReceived':
                $args['value'] = NoticeEventCommentsReceived::jsonDeserialize($data);
                break;
            case 'ChannelReconnectRequired':
                $args['value'] = NoticeEventChannelReconnectRequired::jsonDeserialize($data);
                break;
            case 'ChannelReconnectSoon':
                $args['value'] = NoticeEventChannelReconnectSoon::jsonDeserialize($data);
                break;
            case 'SubscriptionStarted':
                $args['value'] = NoticeEventSubscriptionStarted::jsonDeserialize($data);
                break;
            case 'TrialEnding':
                $args['value'] = NoticeEventTrialEnding::jsonDeserialize($data);
                break;
            case 'PaymentMethodNeeded':
                $args['value'] = NoticeEventPaymentMethodNeeded::jsonDeserialize($data);
                break;
            case 'AllowanceReached':
                $args['value'] = NoticeEventAllowanceReached::jsonDeserialize($data);
                break;
            case 'XSpendCeiling':
                $args['value'] = NoticeEventXSpendCeiling::jsonDeserialize($data);
                break;
            case 'SubscriptionRenewing':
                $args['value'] = NoticeEventSubscriptionRenewing::jsonDeserialize($data);
                break;
            case 'SubscriptionCancelled':
                $args['value'] = NoticeEventSubscriptionCancelled::jsonDeserialize($data);
                break;
            case 'SubscriptionWithdrawn':
                $args['value'] = NoticeEventSubscriptionWithdrawn::jsonDeserialize($data);
                break;
            case 'WebhookEndpointDisabled':
                $args['value'] = NoticeEventWebhookEndpointDisabled::jsonDeserialize($data);
                break;
            case 'WebhookDeliveriesFailing':
                $args['value'] = NoticeEventWebhookDeliveriesFailing::jsonDeserialize($data);
                break;
            case 'AdBoostChanged':
                $args['value'] = NoticeEventAdBoostChanged::jsonDeserialize($data);
                break;
            case 'AdConnectionReconnectRequired':
                $args['value'] = NoticeEventAdConnectionReconnectRequired::jsonDeserialize($data);
                break;
            case 'RecyclingEnded':
                $args['value'] = NoticeEventRecyclingEnded::jsonDeserialize($data);
                break;
            case 'FeedStopped':
                $args['value'] = NoticeEventFeedStopped::jsonDeserialize($data);
                break;
            case '_unknown':
            default:
                $args['type'] = '_unknown';
                $args['value'] = $data;
        }

        // @phpstan-ignore-next-line
        return new static($args);
    }
}
