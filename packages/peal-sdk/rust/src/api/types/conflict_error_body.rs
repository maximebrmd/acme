pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ConflictErrorBody {
    #[non_exhaustive]
    PostNotRecyclable {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(rename = "postId")]
        #[serde(default)]
        post_id: String,
        reason: NotRecyclableReason,
    },

    #[non_exhaustive]
    RecyclingRuleEnded {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(default)]
        reason: String,
    },

    #[non_exhaustive]
    TooManyRecyclingRules {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(default)]
        allowed: i64,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl ConflictErrorBody {
    pub fn post_not_recyclable(post_id: String, reason: NotRecyclableReason) -> Self {
        Self::PostNotRecyclable {
            code: None,
            message: None,
            request_id: None,
            post_id,
            reason,
        }
    }

    pub fn recycling_rule_ended(reason: String) -> Self {
        Self::RecyclingRuleEnded {
            code: None,
            message: None,
            request_id: None,
            reason,
        }
    }

    pub fn too_many_recycling_rules(allowed: i64) -> Self {
        Self::TooManyRecyclingRules {
            code: None,
            message: None,
            request_id: None,
            allowed,
        }
    }

    pub fn post_not_recyclable_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        post_id: String,
        reason: NotRecyclableReason,
    ) -> Self {
        Self::PostNotRecyclable {
            code: Some(code),
            message,
            request_id,
            post_id,
            reason,
        }
    }

    pub fn post_not_recyclable_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        post_id: String,
        reason: NotRecyclableReason,
    ) -> Self {
        Self::PostNotRecyclable {
            code,
            message: Some(message),
            request_id,
            post_id,
            reason,
        }
    }

    pub fn post_not_recyclable_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        post_id: String,
        reason: NotRecyclableReason,
    ) -> Self {
        Self::PostNotRecyclable {
            code,
            message,
            request_id: Some(request_id),
            post_id,
            reason,
        }
    }

    pub fn recycling_rule_ended_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        reason: String,
    ) -> Self {
        Self::RecyclingRuleEnded {
            code: Some(code),
            message,
            request_id,
            reason,
        }
    }

    pub fn recycling_rule_ended_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        reason: String,
    ) -> Self {
        Self::RecyclingRuleEnded {
            code,
            message: Some(message),
            request_id,
            reason,
        }
    }

    pub fn recycling_rule_ended_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        reason: String,
    ) -> Self {
        Self::RecyclingRuleEnded {
            code,
            message,
            request_id: Some(request_id),
            reason,
        }
    }

    pub fn too_many_recycling_rules_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        allowed: i64,
    ) -> Self {
        Self::TooManyRecyclingRules {
            code: Some(code),
            message,
            request_id,
            allowed,
        }
    }

    pub fn too_many_recycling_rules_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        allowed: i64,
    ) -> Self {
        Self::TooManyRecyclingRules {
            code,
            message: Some(message),
            request_id,
            allowed,
        }
    }

    pub fn too_many_recycling_rules_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        allowed: i64,
    ) -> Self {
        Self::TooManyRecyclingRules {
            code,
            message,
            request_id: Some(request_id),
            allowed,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
