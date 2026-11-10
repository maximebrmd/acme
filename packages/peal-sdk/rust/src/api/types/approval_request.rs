pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ApprovalRequest {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub decision: Option<ApprovalRequestDecision>,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "postId")]
    #[serde(default)]
    pub post_id: String,
    #[serde(rename = "requestedAt")]
    #[serde(default)]
    pub requested_at: String,
    #[serde(rename = "requestedBy")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requested_by: Option<String>,
    #[serde(rename = "requestedByName")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requested_by_name: Option<String>,
    #[serde(rename = "requestedVia")]
    pub requested_via: ApprovalOrigin,
    #[serde(default)]
    pub schedule: PostSchedule,
    pub status: ApprovalStatus,
}

impl ApprovalRequest {
    pub fn builder() -> ApprovalRequestBuilder {
        <ApprovalRequestBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ApprovalRequestBuilder {
    decision: Option<ApprovalRequestDecision>,
    id: Option<String>,
    post_id: Option<String>,
    requested_at: Option<String>,
    requested_by: Option<String>,
    requested_by_name: Option<String>,
    requested_via: Option<ApprovalOrigin>,
    schedule: Option<PostSchedule>,
    status: Option<ApprovalStatus>,
}

impl ApprovalRequestBuilder {
    pub fn decision(mut self, value: ApprovalRequestDecision) -> Self {
        self.decision = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn requested_at(mut self, value: impl Into<String>) -> Self {
        self.requested_at = Some(value.into());
        self
    }

    pub fn requested_by(mut self, value: impl Into<String>) -> Self {
        self.requested_by = Some(value.into());
        self
    }

    pub fn requested_by_name(mut self, value: impl Into<String>) -> Self {
        self.requested_by_name = Some(value.into());
        self
    }

    pub fn requested_via(mut self, value: ApprovalOrigin) -> Self {
        self.requested_via = Some(value);
        self
    }

    pub fn schedule(mut self, value: PostSchedule) -> Self {
        self.schedule = Some(value);
        self
    }

    pub fn status(mut self, value: ApprovalStatus) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ApprovalRequest`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](ApprovalRequestBuilder::id)
    /// - [`post_id`](ApprovalRequestBuilder::post_id)
    /// - [`requested_at`](ApprovalRequestBuilder::requested_at)
    /// - [`requested_via`](ApprovalRequestBuilder::requested_via)
    /// - [`schedule`](ApprovalRequestBuilder::schedule)
    /// - [`status`](ApprovalRequestBuilder::status)
    pub fn build(self) -> Result<ApprovalRequest, BuildError> {
        Ok(ApprovalRequest {
            decision: self.decision,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            post_id: self
                .post_id
                .ok_or_else(|| BuildError::missing_field("post_id"))?,
            requested_at: self
                .requested_at
                .ok_or_else(|| BuildError::missing_field("requested_at"))?,
            requested_by: self.requested_by,
            requested_by_name: self.requested_by_name,
            requested_via: self
                .requested_via
                .ok_or_else(|| BuildError::missing_field("requested_via"))?,
            schedule: self
                .schedule
                .ok_or_else(|| BuildError::missing_field("schedule"))?,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
        })
    }
}
