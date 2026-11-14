pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum NoticeEvent {
    #[non_exhaustive]
    PostPublished {
        #[serde(skip_serializing_if = "Option::is_none")]
        channel: Option<NoticeChannel>,
        #[serde(skip_serializing_if = "Option::is_none")]
        permalink: Option<String>,
        #[serde(rename = "postId")]
        #[serde(default)]
        post_id: String,
    },

    #[non_exhaustive]
    PostFailed {
        #[serde(skip_serializing_if = "Option::is_none")]
        channel: Option<NoticeChannel>,
        #[serde(rename = "notSent")]
        #[serde(skip_serializing_if = "Option::is_none")]
        not_sent: Option<PostPartsNotSent>,
        #[serde(rename = "postId")]
        #[serde(default)]
        post_id: String,
        reason: FailureReason,
    },

    #[non_exhaustive]
    PostUnconfirmed {
        #[serde(skip_serializing_if = "Option::is_none")]
        channel: Option<NoticeChannel>,
        #[serde(rename = "postId")]
        #[serde(default)]
        post_id: String,
    },

    #[non_exhaustive]
    PostApprovalRequested {
        #[serde(rename = "postId")]
        #[serde(default)]
        post_id: String,
        #[serde(rename = "scheduledAt")]
        #[serde(default)]
        scheduled_at: String,
    },

    #[non_exhaustive]
    PostApproved {
        by: ReviewParty,
        #[serde(default)]
        late: bool,
        #[serde(rename = "postId")]
        #[serde(default)]
        post_id: String,
    },

    #[non_exhaustive]
    PostChangesRequested {
        by: ReviewParty,
        #[serde(rename = "postId")]
        #[serde(default)]
        post_id: String,
    },

    #[non_exhaustive]
    PostCommented {
        by: ReviewParty,
        #[serde(rename = "postId")]
        #[serde(default)]
        post_id: String,
    },

    #[non_exhaustive]
    CommentsReceived {
        #[serde(default)]
        count: i64,
        #[serde(rename = "postId")]
        #[serde(default)]
        post_id: String,
        #[serde(rename = "threadId")]
        #[serde(default)]
        thread_id: String,
    },

    #[non_exhaustive]
    MessagesReceived {
        channel: NoticeChannel,
        #[serde(rename = "conversationId")]
        #[serde(default)]
        conversation_id: String,
        #[serde(default)]
        count: i64,
    },

    #[non_exhaustive]
    MessagesTurnedOff { channel: NoticeChannel },

    #[non_exhaustive]
    ChannelReconnectRequired { channel: NoticeChannel },

    #[non_exhaustive]
    ChannelReconnectSoon {
        channel: NoticeChannel,
        #[serde(rename = "expiresAt")]
        #[serde(default)]
        expires_at: String,
    },

    #[non_exhaustive]
    SubscriptionStarted {
        interval: BillingInterval,
        plan: PaidPlan,
        #[serde(default)]
        price: Money,
        #[serde(rename = "startedAt")]
        #[serde(default)]
        started_at: String,
        #[serde(rename = "trialEnd")]
        #[serde(skip_serializing_if = "Option::is_none")]
        trial_end: Option<String>,
    },

    #[non_exhaustive]
    TrialEnding {
        #[serde(rename = "endsAt")]
        #[serde(default)]
        ends_at: String,
        #[serde(default)]
        over: Vec<Excess>,
        plan: PaidPlan,
    },

    #[non_exhaustive]
    PaymentMethodNeeded {
        #[serde(default)]
        accounts: i64,
        #[serde(default)]
        allowed: i64,
        #[serde(rename = "graceUntil")]
        #[serde(default)]
        grace_until: String,
    },

    #[non_exhaustive]
    PlansRetiring {
        #[serde(rename = "endsAt")]
        #[serde(default)]
        ends_at: String,
        plan: PaidPlan,
    },

    #[non_exhaustive]
    AllowanceReached {
        #[serde(default)]
        allowed: i64,
        meter: Meter,
        #[serde(rename = "resetsAt")]
        #[serde(default)]
        resets_at: String,
    },

    #[non_exhaustive]
    XSpendCeiling {
        #[serde(default)]
        ceiling: i64,
        #[serde(default)]
        percent: i64,
        #[serde(rename = "resetsAt")]
        #[serde(default)]
        resets_at: String,
    },

    #[non_exhaustive]
    SubscriptionRenewing {
        plan: PaidPlan,
        #[serde(default)]
        price: Money,
        #[serde(rename = "renewsAt")]
        #[serde(default)]
        renews_at: String,
    },

    #[non_exhaustive]
    SubscriptionCancelled {
        #[serde(rename = "endsAt")]
        #[serde(default)]
        ends_at: String,
        plan: PaidPlan,
    },

    #[non_exhaustive]
    SubscriptionWithdrawn {
        plan: PaidPlan,
        #[serde(default)]
        refunded: Money,
        #[serde(rename = "withdrawnAt")]
        #[serde(default)]
        withdrawn_at: String,
    },

    #[non_exhaustive]
    WebhookEndpointDisabled {
        #[serde(rename = "endpointId")]
        #[serde(default)]
        endpoint_id: String,
        #[serde(default)]
        host: String,
        reason: WebhookTurnOffReason,
    },

    #[non_exhaustive]
    WebhookDeliveriesFailing {
        #[serde(rename = "endpointId")]
        #[serde(default)]
        endpoint_id: String,
        #[serde(default)]
        host: String,
    },

    #[non_exhaustive]
    AdBoostChanged {
        #[serde(rename = "boostId")]
        #[serde(default)]
        boost_id: String,
        #[serde(default)]
        budget: Money,
        #[serde(rename = "budgetDigits")]
        #[serde(default)]
        #[serde(with = "crate::core::number_serializers")]
        budget_digits: f64,
        change: NoticeEventAdBoostChangedChange,
        #[serde(rename = "endsAt")]
        #[serde(default)]
        ends_at: String,
        #[serde(rename = "postId")]
        #[serde(default)]
        post_id: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        reason: Option<String>,
    },

    #[non_exhaustive]
    AdConnectionReconnectRequired {
        #[serde(default)]
        network: String,
    },

    #[non_exhaustive]
    RecyclingEnded {
        reason: RecyclingNoticeReason,
        #[serde(rename = "ruleId")]
        #[serde(default)]
        rule_id: String,
        #[serde(rename = "sourcePostId")]
        #[serde(default)]
        source_post_id: String,
    },

    #[non_exhaustive]
    FeedStopped {
        #[serde(rename = "feedId")]
        #[serde(default)]
        feed_id: String,
        reason: FeedStopReason,
    },

    #[non_exhaustive]
    FollowUpsNotSent {
        #[serde(default)]
        count: i64,
        #[serde(default)]
        reasons: Vec<FollowUpNotSentReason>,
        #[serde(rename = "ruleId")]
        #[serde(default)]
        rule_id: String,
    },

    #[non_exhaustive]
    FollowUpRuleStopped {
        reason: AutomationStopReason,
        #[serde(rename = "ruleId")]
        #[serde(default)]
        rule_id: String,
    },

    #[non_exhaustive]
    CommentRuleStopped {
        reason: AutomationStopReason,
        #[serde(rename = "ruleId")]
        #[serde(default)]
        rule_id: String,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl NoticeEvent {
    pub fn post_published(post_id: String) -> Self {
        Self::PostPublished {
            channel: None,
            permalink: None,
            post_id,
        }
    }

    pub fn post_failed(post_id: String, reason: FailureReason) -> Self {
        Self::PostFailed {
            channel: None,
            not_sent: None,
            post_id,
            reason,
        }
    }

    pub fn post_unconfirmed(post_id: String) -> Self {
        Self::PostUnconfirmed {
            channel: None,
            post_id,
        }
    }

    pub fn post_approval_requested(post_id: String, scheduled_at: String) -> Self {
        Self::PostApprovalRequested {
            post_id,
            scheduled_at,
        }
    }

    pub fn post_approved(by: ReviewParty, late: bool, post_id: String) -> Self {
        Self::PostApproved { by, late, post_id }
    }

    pub fn post_changes_requested(by: ReviewParty, post_id: String) -> Self {
        Self::PostChangesRequested { by, post_id }
    }

    pub fn post_commented(by: ReviewParty, post_id: String) -> Self {
        Self::PostCommented { by, post_id }
    }

    pub fn comments_received(count: i64, post_id: String, thread_id: String) -> Self {
        Self::CommentsReceived {
            count,
            post_id,
            thread_id,
        }
    }

    pub fn messages_received(channel: NoticeChannel, conversation_id: String, count: i64) -> Self {
        Self::MessagesReceived {
            channel,
            conversation_id,
            count,
        }
    }

    pub fn messages_turned_off(channel: NoticeChannel) -> Self {
        Self::MessagesTurnedOff { channel }
    }

    pub fn channel_reconnect_required(channel: NoticeChannel) -> Self {
        Self::ChannelReconnectRequired { channel }
    }

    pub fn channel_reconnect_soon(channel: NoticeChannel, expires_at: String) -> Self {
        Self::ChannelReconnectSoon {
            channel,
            expires_at,
        }
    }

    pub fn subscription_started(
        interval: BillingInterval,
        plan: PaidPlan,
        price: Money,
        started_at: String,
    ) -> Self {
        Self::SubscriptionStarted {
            interval,
            plan,
            price,
            started_at,
            trial_end: None,
        }
    }

    pub fn trial_ending(ends_at: String, over: Vec<Excess>, plan: PaidPlan) -> Self {
        Self::TrialEnding {
            ends_at,
            over,
            plan,
        }
    }

    pub fn payment_method_needed(accounts: i64, allowed: i64, grace_until: String) -> Self {
        Self::PaymentMethodNeeded {
            accounts,
            allowed,
            grace_until,
        }
    }

    pub fn plans_retiring(ends_at: String, plan: PaidPlan) -> Self {
        Self::PlansRetiring { ends_at, plan }
    }

    pub fn allowance_reached(allowed: i64, meter: Meter, resets_at: String) -> Self {
        Self::AllowanceReached {
            allowed,
            meter,
            resets_at,
        }
    }

    pub fn x_spend_ceiling(ceiling: i64, percent: i64, resets_at: String) -> Self {
        Self::XSpendCeiling {
            ceiling,
            percent,
            resets_at,
        }
    }

    pub fn subscription_renewing(plan: PaidPlan, price: Money, renews_at: String) -> Self {
        Self::SubscriptionRenewing {
            plan,
            price,
            renews_at,
        }
    }

    pub fn subscription_cancelled(ends_at: String, plan: PaidPlan) -> Self {
        Self::SubscriptionCancelled { ends_at, plan }
    }

    pub fn subscription_withdrawn(plan: PaidPlan, refunded: Money, withdrawn_at: String) -> Self {
        Self::SubscriptionWithdrawn {
            plan,
            refunded,
            withdrawn_at,
        }
    }

    pub fn webhook_endpoint_disabled(
        endpoint_id: String,
        host: String,
        reason: WebhookTurnOffReason,
    ) -> Self {
        Self::WebhookEndpointDisabled {
            endpoint_id,
            host,
            reason,
        }
    }

    pub fn webhook_deliveries_failing(endpoint_id: String, host: String) -> Self {
        Self::WebhookDeliveriesFailing { endpoint_id, host }
    }

    pub fn ad_boost_changed(
        boost_id: String,
        budget: Money,
        budget_digits: f64,
        change: NoticeEventAdBoostChangedChange,
        ends_at: String,
        post_id: String,
    ) -> Self {
        Self::AdBoostChanged {
            boost_id,
            budget,
            budget_digits,
            change,
            ends_at,
            post_id,
            reason: None,
        }
    }

    pub fn ad_connection_reconnect_required(network: String) -> Self {
        Self::AdConnectionReconnectRequired { network }
    }

    pub fn recycling_ended(
        reason: RecyclingNoticeReason,
        rule_id: String,
        source_post_id: String,
    ) -> Self {
        Self::RecyclingEnded {
            reason,
            rule_id,
            source_post_id,
        }
    }

    pub fn feed_stopped(feed_id: String, reason: FeedStopReason) -> Self {
        Self::FeedStopped { feed_id, reason }
    }

    pub fn follow_ups_not_sent(
        count: i64,
        reasons: Vec<FollowUpNotSentReason>,
        rule_id: String,
    ) -> Self {
        Self::FollowUpsNotSent {
            count,
            reasons,
            rule_id,
        }
    }

    pub fn follow_up_rule_stopped(reason: AutomationStopReason, rule_id: String) -> Self {
        Self::FollowUpRuleStopped { reason, rule_id }
    }

    pub fn comment_rule_stopped(reason: AutomationStopReason, rule_id: String) -> Self {
        Self::CommentRuleStopped { reason, rule_id }
    }

    pub fn post_published_with_channel(
        channel: NoticeChannel,
        permalink: Option<String>,
        post_id: String,
    ) -> Self {
        Self::PostPublished {
            channel: Some(channel),
            permalink,
            post_id,
        }
    }

    pub fn post_published_with_permalink(
        channel: Option<NoticeChannel>,
        permalink: String,
        post_id: String,
    ) -> Self {
        Self::PostPublished {
            channel,
            permalink: Some(permalink),
            post_id,
        }
    }

    pub fn post_failed_with_channel(
        channel: NoticeChannel,
        not_sent: Option<PostPartsNotSent>,
        post_id: String,
        reason: FailureReason,
    ) -> Self {
        Self::PostFailed {
            channel: Some(channel),
            not_sent,
            post_id,
            reason,
        }
    }

    pub fn post_failed_with_not_sent(
        channel: Option<NoticeChannel>,
        not_sent: PostPartsNotSent,
        post_id: String,
        reason: FailureReason,
    ) -> Self {
        Self::PostFailed {
            channel,
            not_sent: Some(not_sent),
            post_id,
            reason,
        }
    }

    pub fn post_unconfirmed_with_channel(channel: NoticeChannel, post_id: String) -> Self {
        Self::PostUnconfirmed {
            channel: Some(channel),
            post_id,
        }
    }

    pub fn subscription_started_with_trial_end(
        interval: BillingInterval,
        plan: PaidPlan,
        price: Money,
        started_at: String,
        trial_end: String,
    ) -> Self {
        Self::SubscriptionStarted {
            interval,
            plan,
            price,
            started_at,
            trial_end: Some(trial_end),
        }
    }

    pub fn ad_boost_changed_with_reason(
        boost_id: String,
        budget: Money,
        budget_digits: f64,
        change: NoticeEventAdBoostChangedChange,
        ends_at: String,
        post_id: String,
        reason: String,
    ) -> Self {
        Self::AdBoostChanged {
            boost_id,
            budget,
            budget_digits,
            change,
            ends_at,
            post_id,
            reason: Some(reason),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
