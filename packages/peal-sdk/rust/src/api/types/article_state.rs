pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ArticleState {
    #[serde(rename = "draft")]
    #[non_exhaustive]
    Draft {},

    #[serde(rename = "scheduled")]
    #[non_exhaustive]
    Scheduled {
        #[serde(rename = "scheduledAt")]
        #[serde(default)]
        scheduled_at: String,
        #[serde(rename = "timeZone")]
        #[serde(default)]
        time_zone: String,
    },

    #[serde(rename = "publishing")]
    #[non_exhaustive]
    Publishing {
        #[serde(rename = "scheduledAt")]
        #[serde(default)]
        scheduled_at: String,
        #[serde(rename = "timeZone")]
        #[serde(default)]
        time_zone: String,
        #[serde(default)]
        since: String,
    },

    #[serde(rename = "published")]
    #[non_exhaustive]
    Published {
        #[serde(rename = "scheduledAt")]
        #[serde(default)]
        scheduled_at: String,
        #[serde(rename = "timeZone")]
        #[serde(default)]
        time_zone: String,
        #[serde(rename = "editedAt")]
        #[serde(skip_serializing_if = "Option::is_none")]
        edited_at: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        permalink: Option<String>,
        #[serde(rename = "platformPostId")]
        #[serde(default)]
        platform_post_id: String,
        #[serde(rename = "publishedAt")]
        #[serde(default)]
        published_at: String,
        #[serde(rename = "removedAt")]
        #[serde(skip_serializing_if = "Option::is_none")]
        removed_at: Option<String>,
    },

    #[serde(rename = "failed")]
    #[non_exhaustive]
    Failed {
        #[serde(rename = "scheduledAt")]
        #[serde(default)]
        scheduled_at: String,
        #[serde(rename = "timeZone")]
        #[serde(default)]
        time_zone: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(rename = "failedAt")]
        #[serde(default)]
        failed_at: String,
        reason: FailureReason,
    },

    #[serde(rename = "unconfirmed")]
    #[non_exhaustive]
    Unconfirmed {
        #[serde(rename = "scheduledAt")]
        #[serde(default)]
        scheduled_at: String,
        #[serde(rename = "timeZone")]
        #[serde(default)]
        time_zone: String,
        #[serde(rename = "attemptedAt")]
        #[serde(default)]
        attempted_at: String,
        reason: UnconfirmedReason,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl ArticleState {
    pub fn draft() -> Self {
        Self::Draft {}
    }

    pub fn scheduled(scheduled_at: String, time_zone: String) -> Self {
        Self::Scheduled {
            scheduled_at,
            time_zone,
        }
    }

    pub fn publishing(scheduled_at: String, time_zone: String, since: String) -> Self {
        Self::Publishing {
            scheduled_at,
            time_zone,
            since,
        }
    }

    pub fn published(
        scheduled_at: String,
        time_zone: String,
        platform_post_id: String,
        published_at: String,
    ) -> Self {
        Self::Published {
            scheduled_at,
            time_zone,
            edited_at: None,
            permalink: None,
            platform_post_id,
            published_at,
            removed_at: None,
        }
    }

    pub fn failed(
        scheduled_at: String,
        time_zone: String,
        failed_at: String,
        reason: FailureReason,
    ) -> Self {
        Self::Failed {
            scheduled_at,
            time_zone,
            code: None,
            failed_at,
            reason,
        }
    }

    pub fn unconfirmed(
        scheduled_at: String,
        time_zone: String,
        attempted_at: String,
        reason: UnconfirmedReason,
    ) -> Self {
        Self::Unconfirmed {
            scheduled_at,
            time_zone,
            attempted_at,
            reason,
        }
    }

    pub fn published_with_edited_at(
        scheduled_at: String,
        time_zone: String,
        edited_at: String,
        permalink: Option<String>,
        platform_post_id: String,
        published_at: String,
        removed_at: Option<String>,
    ) -> Self {
        Self::Published {
            scheduled_at,
            time_zone,
            edited_at: Some(edited_at),
            permalink,
            platform_post_id,
            published_at,
            removed_at,
        }
    }

    pub fn published_with_permalink(
        scheduled_at: String,
        time_zone: String,
        edited_at: Option<String>,
        permalink: String,
        platform_post_id: String,
        published_at: String,
        removed_at: Option<String>,
    ) -> Self {
        Self::Published {
            scheduled_at,
            time_zone,
            edited_at,
            permalink: Some(permalink),
            platform_post_id,
            published_at,
            removed_at,
        }
    }

    pub fn published_with_removed_at(
        scheduled_at: String,
        time_zone: String,
        edited_at: Option<String>,
        permalink: Option<String>,
        platform_post_id: String,
        published_at: String,
        removed_at: String,
    ) -> Self {
        Self::Published {
            scheduled_at,
            time_zone,
            edited_at,
            permalink,
            platform_post_id,
            published_at,
            removed_at: Some(removed_at),
        }
    }

    pub fn failed_with_code(
        scheduled_at: String,
        time_zone: String,
        code: String,
        failed_at: String,
        reason: FailureReason,
    ) -> Self {
        Self::Failed {
            scheduled_at,
            time_zone,
            code: Some(code),
            failed_at,
            reason,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
