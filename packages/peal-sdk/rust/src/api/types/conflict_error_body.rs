pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ConflictErrorBody {
    #[non_exhaustive]
    FollowUpRuleTaken {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(rename = "ruleId")]
        #[serde(default)]
        rule_id: String,
    },

    #[non_exhaustive]
    TooManyFollowUpRules {
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
    pub fn follow_up_rule_taken(rule_id: String) -> Self {
        Self::FollowUpRuleTaken {
            code: None,
            message: None,
            request_id: None,
            rule_id,
        }
    }

    pub fn too_many_follow_up_rules(allowed: i64) -> Self {
        Self::TooManyFollowUpRules {
            code: None,
            message: None,
            request_id: None,
            allowed,
        }
    }

    pub fn follow_up_rule_taken_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        rule_id: String,
    ) -> Self {
        Self::FollowUpRuleTaken {
            code: Some(code),
            message,
            request_id,
            rule_id,
        }
    }

    pub fn follow_up_rule_taken_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        rule_id: String,
    ) -> Self {
        Self::FollowUpRuleTaken {
            code,
            message: Some(message),
            request_id,
            rule_id,
        }
    }

    pub fn follow_up_rule_taken_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        rule_id: String,
    ) -> Self {
        Self::FollowUpRuleTaken {
            code,
            message,
            request_id: Some(request_id),
            rule_id,
        }
    }

    pub fn too_many_follow_up_rules_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        allowed: i64,
    ) -> Self {
        Self::TooManyFollowUpRules {
            code: Some(code),
            message,
            request_id,
            allowed,
        }
    }

    pub fn too_many_follow_up_rules_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        allowed: i64,
    ) -> Self {
        Self::TooManyFollowUpRules {
            code,
            message: Some(message),
            request_id,
            allowed,
        }
    }

    pub fn too_many_follow_up_rules_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        allowed: i64,
    ) -> Self {
        Self::TooManyFollowUpRules {
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
