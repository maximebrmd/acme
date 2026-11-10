pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct AssistantQuotaExceededEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(rename = "billingUrl")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub billing_url: Option<String>,
    #[serde(rename = "dailyLimit")]
    #[serde(default)]
    pub daily_limit: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan: Option<Plan>,
    #[serde(rename = "planWithRoom")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan_with_room: Option<PaidPlan>,
    #[serde(rename = "resetsAt")]
    #[serde(default)]
    pub resets_at: String,
}

impl AssistantQuotaExceededEncoded {
    pub fn builder() -> AssistantQuotaExceededEncodedBuilder {
        <AssistantQuotaExceededEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AssistantQuotaExceededEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    billing_url: Option<String>,
    daily_limit: Option<i64>,
    plan: Option<Plan>,
    plan_with_room: Option<PaidPlan>,
    resets_at: Option<String>,
}

impl AssistantQuotaExceededEncodedBuilder {
    pub fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
        self
    }

    pub fn message(mut self, value: impl Into<String>) -> Self {
        self.message = Some(value.into());
        self
    }

    pub fn request_id(mut self, value: impl Into<String>) -> Self {
        self.request_id = Some(value.into());
        self
    }

    pub fn billing_url(mut self, value: impl Into<String>) -> Self {
        self.billing_url = Some(value.into());
        self
    }

    pub fn daily_limit(mut self, value: i64) -> Self {
        self.daily_limit = Some(value);
        self
    }

    pub fn plan(mut self, value: Plan) -> Self {
        self.plan = Some(value);
        self
    }

    pub fn plan_with_room(mut self, value: PaidPlan) -> Self {
        self.plan_with_room = Some(value);
        self
    }

    pub fn resets_at(mut self, value: impl Into<String>) -> Self {
        self.resets_at = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`AssistantQuotaExceededEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`daily_limit`](AssistantQuotaExceededEncodedBuilder::daily_limit)
    /// - [`resets_at`](AssistantQuotaExceededEncodedBuilder::resets_at)
    pub fn build(self) -> Result<AssistantQuotaExceededEncoded, BuildError> {
        Ok(AssistantQuotaExceededEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            billing_url: self.billing_url,
            daily_limit: self
                .daily_limit
                .ok_or_else(|| BuildError::missing_field("daily_limit"))?,
            plan: self.plan,
            plan_with_room: self.plan_with_room,
            resets_at: self
                .resets_at
                .ok_or_else(|| BuildError::missing_field("resets_at"))?,
        })
    }
}
