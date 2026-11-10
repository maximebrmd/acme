pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum PostRefusal {
    #[non_exhaustive]
    PostContentInvalid {
        #[serde(default)]
        violations: Vec<ContentViolation>,
    },

    #[non_exhaustive]
    UnknownChannels {
        #[serde(rename = "channelIds")]
        #[serde(default)]
        channel_ids: Vec<String>,
    },

    #[non_exhaustive]
    UnknownMedia {
        #[serde(rename = "mediaIds")]
        #[serde(default)]
        media_ids: Vec<String>,
    },

    #[non_exhaustive]
    ScheduleInPast {},

    #[non_exhaustive]
    InvalidTimeZone {
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
    IdempotencyKeyReused {},

    #[non_exhaustive]
    PostNotFound {},

    #[non_exhaustive]
    DuplicatePost {
        #[serde(default)]
        duplicates: Vec<DuplicateOnChannel>,
    },

    #[non_exhaustive]
    Forbidden {
        #[serde(flatten)]
        data: ForbiddenEncoded,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl PostRefusal {
    pub fn post_content_invalid(violations: Vec<ContentViolation>) -> Self {
        Self::PostContentInvalid { violations }
    }

    pub fn unknown_channels(channel_ids: Vec<String>) -> Self {
        Self::UnknownChannels { channel_ids }
    }

    pub fn unknown_media(media_ids: Vec<String>) -> Self {
        Self::UnknownMedia { media_ids }
    }

    pub fn schedule_in_past() -> Self {
        Self::ScheduleInPast {}
    }

    pub fn invalid_time_zone(time_zone: String) -> Self {
        Self::InvalidTimeZone { time_zone }
    }

    pub fn plan_limit_reached(data: PlanLimitReachedEncoded) -> Self {
        Self::PlanLimitReached { data }
    }

    pub fn idempotency_key_reused() -> Self {
        Self::IdempotencyKeyReused {}
    }

    pub fn post_not_found() -> Self {
        Self::PostNotFound {}
    }

    pub fn duplicate_post(duplicates: Vec<DuplicateOnChannel>) -> Self {
        Self::DuplicatePost { duplicates }
    }

    pub fn forbidden(data: ForbiddenEncoded) -> Self {
        Self::Forbidden { data }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
