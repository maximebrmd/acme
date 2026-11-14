pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum PaymentRequiredErrorBody {
    #[non_exhaustive]
    UsageAllowanceReached {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(default)]
        allowed: i64,
        #[serde(rename = "billingUrl")]
        #[serde(default)]
        billing_url: String,
        meter: Meter,
        reason: AllowanceReason,
        #[serde(rename = "resetsAt")]
        #[serde(default)]
        resets_at: String,
        #[serde(default)]
        used: i64,
    },

    #[non_exhaustive]
    PlanLimitReached {
        #[serde(flatten)]
        data: PlanLimitReachedEncoded,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl PaymentRequiredErrorBody {
    pub fn usage_allowance_reached(
        allowed: i64,
        billing_url: String,
        meter: Meter,
        reason: AllowanceReason,
        resets_at: String,
        used: i64,
    ) -> Self {
        Self::UsageAllowanceReached {
            code: None,
            message: None,
            request_id: None,
            allowed,
            billing_url,
            meter,
            reason,
            resets_at,
            used,
        }
    }

    pub fn plan_limit_reached(data: PlanLimitReachedEncoded) -> Self {
        Self::PlanLimitReached { data }
    }

    pub fn usage_allowance_reached_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        allowed: i64,
        billing_url: String,
        meter: Meter,
        reason: AllowanceReason,
        resets_at: String,
        used: i64,
    ) -> Self {
        Self::UsageAllowanceReached {
            code: Some(code),
            message,
            request_id,
            allowed,
            billing_url,
            meter,
            reason,
            resets_at,
            used,
        }
    }

    pub fn usage_allowance_reached_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        allowed: i64,
        billing_url: String,
        meter: Meter,
        reason: AllowanceReason,
        resets_at: String,
        used: i64,
    ) -> Self {
        Self::UsageAllowanceReached {
            code,
            message: Some(message),
            request_id,
            allowed,
            billing_url,
            meter,
            reason,
            resets_at,
            used,
        }
    }

    pub fn usage_allowance_reached_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        allowed: i64,
        billing_url: String,
        meter: Meter,
        reason: AllowanceReason,
        resets_at: String,
        used: i64,
    ) -> Self {
        Self::UsageAllowanceReached {
            code,
            message,
            request_id: Some(request_id),
            allowed,
            billing_url,
            meter,
            reason,
            resets_at,
            used,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
