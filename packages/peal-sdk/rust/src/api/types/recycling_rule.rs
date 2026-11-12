pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct RecyclingRule {
    #[serde(rename = "anchorAt")]
    #[serde(default)]
    pub anchor_at: String,
    #[serde(default)]
    pub coming: Vec<RecyclingComing>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub count: Option<i64>,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(rename = "endedReason")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ended_reason: Option<RecyclingEndReason>,
    pub every: RecyclingInterval,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "lastDueAt")]
    #[serde(default)]
    pub last_due_at: String,
    #[serde(default)]
    pub made: i64,
    #[serde(rename = "nextDueAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_due_at: Option<String>,
    #[serde(rename = "queueId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub queue_id: Option<String>,
    #[serde(rename = "sourcePostId")]
    #[serde(default)]
    pub source_post_id: String,
    #[serde(rename = "startedBy")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_by: Option<String>,
    #[serde(rename = "startedVia")]
    pub started_via: PostOrigin,
    pub status: RecyclingStatus,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub until: Option<CalendarDay>,
    #[serde(default)]
    pub variants: Vec<RecyclingRuleVariantsItem>,
}

impl RecyclingRule {
    pub fn builder() -> RecyclingRuleBuilder {
        <RecyclingRuleBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RecyclingRuleBuilder {
    anchor_at: Option<String>,
    coming: Option<Vec<RecyclingComing>>,
    count: Option<i64>,
    created_at: Option<String>,
    ended_reason: Option<RecyclingEndReason>,
    every: Option<RecyclingInterval>,
    id: Option<String>,
    last_due_at: Option<String>,
    made: Option<i64>,
    next_due_at: Option<String>,
    queue_id: Option<String>,
    source_post_id: Option<String>,
    started_by: Option<String>,
    started_via: Option<PostOrigin>,
    status: Option<RecyclingStatus>,
    time_zone: Option<String>,
    until: Option<CalendarDay>,
    variants: Option<Vec<RecyclingRuleVariantsItem>>,
}

impl RecyclingRuleBuilder {
    pub fn anchor_at(mut self, value: impl Into<String>) -> Self {
        self.anchor_at = Some(value.into());
        self
    }

    pub fn coming(mut self, value: Vec<RecyclingComing>) -> Self {
        self.coming = Some(value);
        self
    }

    pub fn count(mut self, value: i64) -> Self {
        self.count = Some(value);
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn ended_reason(mut self, value: RecyclingEndReason) -> Self {
        self.ended_reason = Some(value);
        self
    }

    pub fn every(mut self, value: RecyclingInterval) -> Self {
        self.every = Some(value);
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn last_due_at(mut self, value: impl Into<String>) -> Self {
        self.last_due_at = Some(value.into());
        self
    }

    pub fn made(mut self, value: i64) -> Self {
        self.made = Some(value);
        self
    }

    pub fn next_due_at(mut self, value: impl Into<String>) -> Self {
        self.next_due_at = Some(value.into());
        self
    }

    pub fn queue_id(mut self, value: impl Into<String>) -> Self {
        self.queue_id = Some(value.into());
        self
    }

    pub fn source_post_id(mut self, value: impl Into<String>) -> Self {
        self.source_post_id = Some(value.into());
        self
    }

    pub fn started_by(mut self, value: impl Into<String>) -> Self {
        self.started_by = Some(value.into());
        self
    }

    pub fn started_via(mut self, value: PostOrigin) -> Self {
        self.started_via = Some(value);
        self
    }

    pub fn status(mut self, value: RecyclingStatus) -> Self {
        self.status = Some(value);
        self
    }

    pub fn time_zone(mut self, value: impl Into<String>) -> Self {
        self.time_zone = Some(value.into());
        self
    }

    pub fn until(mut self, value: CalendarDay) -> Self {
        self.until = Some(value);
        self
    }

    pub fn variants(mut self, value: Vec<RecyclingRuleVariantsItem>) -> Self {
        self.variants = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`RecyclingRule`].
    /// This method will fail if any of the following fields are not set:
    /// - [`anchor_at`](RecyclingRuleBuilder::anchor_at)
    /// - [`coming`](RecyclingRuleBuilder::coming)
    /// - [`created_at`](RecyclingRuleBuilder::created_at)
    /// - [`every`](RecyclingRuleBuilder::every)
    /// - [`id`](RecyclingRuleBuilder::id)
    /// - [`last_due_at`](RecyclingRuleBuilder::last_due_at)
    /// - [`made`](RecyclingRuleBuilder::made)
    /// - [`source_post_id`](RecyclingRuleBuilder::source_post_id)
    /// - [`started_via`](RecyclingRuleBuilder::started_via)
    /// - [`status`](RecyclingRuleBuilder::status)
    /// - [`time_zone`](RecyclingRuleBuilder::time_zone)
    /// - [`variants`](RecyclingRuleBuilder::variants)
    pub fn build(self) -> Result<RecyclingRule, BuildError> {
        Ok(RecyclingRule {
            anchor_at: self
                .anchor_at
                .ok_or_else(|| BuildError::missing_field("anchor_at"))?,
            coming: self
                .coming
                .ok_or_else(|| BuildError::missing_field("coming"))?,
            count: self.count,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            ended_reason: self.ended_reason,
            every: self
                .every
                .ok_or_else(|| BuildError::missing_field("every"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            last_due_at: self
                .last_due_at
                .ok_or_else(|| BuildError::missing_field("last_due_at"))?,
            made: self.made.ok_or_else(|| BuildError::missing_field("made"))?,
            next_due_at: self.next_due_at,
            queue_id: self.queue_id,
            source_post_id: self
                .source_post_id
                .ok_or_else(|| BuildError::missing_field("source_post_id"))?,
            started_by: self.started_by,
            started_via: self
                .started_via
                .ok_or_else(|| BuildError::missing_field("started_via"))?,
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
            until: self.until,
            variants: self
                .variants
                .ok_or_else(|| BuildError::missing_field("variants"))?,
        })
    }
}
