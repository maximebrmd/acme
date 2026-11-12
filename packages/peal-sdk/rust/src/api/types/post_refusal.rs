pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum PostRefusal {
    #[non_exhaustive]
    PostContentInvalid {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(default)]
        violations: Vec<ContentViolation>,
    },

    #[non_exhaustive]
    UnknownChannels {
        #[serde(flatten)]
        data: UnknownChannelsEncoded,
    },

    #[non_exhaustive]
    UnknownMedia {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(rename = "mediaIds")]
        #[serde(default)]
        media_ids: Vec<String>,
    },

    #[non_exhaustive]
    ScheduleInPast {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
    },

    #[non_exhaustive]
    InvalidTimeZone {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(rename = "timeZone")]
        #[serde(default)]
        time_zone: String,
    },

    #[non_exhaustive]
    PlanLimitReached {
        #[serde(flatten)]
        data: PlanLimitReachedEncoded,
    },

    #[non_exhaustive]
    IdempotencyKeyReused {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
    },

    #[non_exhaustive]
    PostNotFound {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
    },

    #[non_exhaustive]
    DuplicatePost {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(default)]
        duplicates: Vec<DuplicateOnChannel>,
    },

    #[non_exhaustive]
    Forbidden {
        #[serde(flatten)]
        data: ForbiddenEncoded,
    },

    #[non_exhaustive]
    UnknownTags {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(rename = "tagIds")]
        #[serde(default)]
        tag_ids: Vec<String>,
    },

    #[non_exhaustive]
    ChannelSetNotFound {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
    },

    #[non_exhaustive]
    SignatureNotFound {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
    },

    #[non_exhaustive]
    QueueNotFound {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
    },

    #[non_exhaustive]
    QueueHasNoRoom {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(rename = "queueId")]
        #[serde(default)]
        queue_id: String,
        reason: QueueNoRoom,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl PostRefusal {
    pub fn post_content_invalid(violations: Vec<ContentViolation>) -> Self {
        Self::PostContentInvalid {
            code: None,
            message: None,
            request_id: None,
            violations,
        }
    }

    pub fn unknown_channels(data: UnknownChannelsEncoded) -> Self {
        Self::UnknownChannels { data }
    }

    pub fn unknown_media(media_ids: Vec<String>) -> Self {
        Self::UnknownMedia {
            code: None,
            message: None,
            request_id: None,
            media_ids,
        }
    }

    pub fn schedule_in_past() -> Self {
        Self::ScheduleInPast {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn invalid_time_zone(time_zone: String) -> Self {
        Self::InvalidTimeZone {
            code: None,
            message: None,
            request_id: None,
            time_zone,
        }
    }

    pub fn plan_limit_reached(data: PlanLimitReachedEncoded) -> Self {
        Self::PlanLimitReached { data }
    }

    pub fn idempotency_key_reused() -> Self {
        Self::IdempotencyKeyReused {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn post_not_found() -> Self {
        Self::PostNotFound {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn duplicate_post(duplicates: Vec<DuplicateOnChannel>) -> Self {
        Self::DuplicatePost {
            code: None,
            message: None,
            request_id: None,
            duplicates,
        }
    }

    pub fn forbidden(data: ForbiddenEncoded) -> Self {
        Self::Forbidden { data }
    }

    pub fn unknown_tags(tag_ids: Vec<String>) -> Self {
        Self::UnknownTags {
            code: None,
            message: None,
            request_id: None,
            tag_ids,
        }
    }

    pub fn channel_set_not_found() -> Self {
        Self::ChannelSetNotFound {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn signature_not_found() -> Self {
        Self::SignatureNotFound {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn queue_not_found() -> Self {
        Self::QueueNotFound {
            code: None,
            message: None,
            request_id: None,
        }
    }

    pub fn queue_has_no_room(queue_id: String, reason: QueueNoRoom) -> Self {
        Self::QueueHasNoRoom {
            code: None,
            message: None,
            request_id: None,
            queue_id,
            reason,
        }
    }

    pub fn post_content_invalid_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        violations: Vec<ContentViolation>,
    ) -> Self {
        Self::PostContentInvalid {
            code: Some(code),
            message,
            request_id,
            violations,
        }
    }

    pub fn post_content_invalid_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        violations: Vec<ContentViolation>,
    ) -> Self {
        Self::PostContentInvalid {
            code,
            message: Some(message),
            request_id,
            violations,
        }
    }

    pub fn post_content_invalid_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        violations: Vec<ContentViolation>,
    ) -> Self {
        Self::PostContentInvalid {
            code,
            message,
            request_id: Some(request_id),
            violations,
        }
    }

    pub fn unknown_media_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        media_ids: Vec<String>,
    ) -> Self {
        Self::UnknownMedia {
            code: Some(code),
            message,
            request_id,
            media_ids,
        }
    }

    pub fn unknown_media_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        media_ids: Vec<String>,
    ) -> Self {
        Self::UnknownMedia {
            code,
            message: Some(message),
            request_id,
            media_ids,
        }
    }

    pub fn unknown_media_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        media_ids: Vec<String>,
    ) -> Self {
        Self::UnknownMedia {
            code,
            message,
            request_id: Some(request_id),
            media_ids,
        }
    }

    pub fn schedule_in_past_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::ScheduleInPast {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn schedule_in_past_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::ScheduleInPast {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn schedule_in_past_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::ScheduleInPast {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn invalid_time_zone_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        time_zone: String,
    ) -> Self {
        Self::InvalidTimeZone {
            code: Some(code),
            message,
            request_id,
            time_zone,
        }
    }

    pub fn invalid_time_zone_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        time_zone: String,
    ) -> Self {
        Self::InvalidTimeZone {
            code,
            message: Some(message),
            request_id,
            time_zone,
        }
    }

    pub fn invalid_time_zone_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        time_zone: String,
    ) -> Self {
        Self::InvalidTimeZone {
            code,
            message,
            request_id: Some(request_id),
            time_zone,
        }
    }

    pub fn idempotency_key_reused_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::IdempotencyKeyReused {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn idempotency_key_reused_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::IdempotencyKeyReused {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn idempotency_key_reused_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::IdempotencyKeyReused {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn post_not_found_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::PostNotFound {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn post_not_found_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::PostNotFound {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn post_not_found_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::PostNotFound {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn duplicate_post_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        duplicates: Vec<DuplicateOnChannel>,
    ) -> Self {
        Self::DuplicatePost {
            code: Some(code),
            message,
            request_id,
            duplicates,
        }
    }

    pub fn duplicate_post_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        duplicates: Vec<DuplicateOnChannel>,
    ) -> Self {
        Self::DuplicatePost {
            code,
            message: Some(message),
            request_id,
            duplicates,
        }
    }

    pub fn duplicate_post_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        duplicates: Vec<DuplicateOnChannel>,
    ) -> Self {
        Self::DuplicatePost {
            code,
            message,
            request_id: Some(request_id),
            duplicates,
        }
    }

    pub fn unknown_tags_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        tag_ids: Vec<String>,
    ) -> Self {
        Self::UnknownTags {
            code: Some(code),
            message,
            request_id,
            tag_ids,
        }
    }

    pub fn unknown_tags_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        tag_ids: Vec<String>,
    ) -> Self {
        Self::UnknownTags {
            code,
            message: Some(message),
            request_id,
            tag_ids,
        }
    }

    pub fn unknown_tags_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        tag_ids: Vec<String>,
    ) -> Self {
        Self::UnknownTags {
            code,
            message,
            request_id: Some(request_id),
            tag_ids,
        }
    }

    pub fn channel_set_not_found_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::ChannelSetNotFound {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn channel_set_not_found_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::ChannelSetNotFound {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn channel_set_not_found_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::ChannelSetNotFound {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn signature_not_found_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::SignatureNotFound {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn signature_not_found_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::SignatureNotFound {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn signature_not_found_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::SignatureNotFound {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn queue_not_found_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
    ) -> Self {
        Self::QueueNotFound {
            code: Some(code),
            message,
            request_id,
        }
    }

    pub fn queue_not_found_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
    ) -> Self {
        Self::QueueNotFound {
            code,
            message: Some(message),
            request_id,
        }
    }

    pub fn queue_not_found_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
    ) -> Self {
        Self::QueueNotFound {
            code,
            message,
            request_id: Some(request_id),
        }
    }

    pub fn queue_has_no_room_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        queue_id: String,
        reason: QueueNoRoom,
    ) -> Self {
        Self::QueueHasNoRoom {
            code: Some(code),
            message,
            request_id,
            queue_id,
            reason,
        }
    }

    pub fn queue_has_no_room_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        queue_id: String,
        reason: QueueNoRoom,
    ) -> Self {
        Self::QueueHasNoRoom {
            code,
            message: Some(message),
            request_id,
            queue_id,
            reason,
        }
    }

    pub fn queue_has_no_room_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        queue_id: String,
        reason: QueueNoRoom,
    ) -> Self {
        Self::QueueHasNoRoom {
            code,
            message,
            request_id: Some(request_id),
            queue_id,
            reason,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
