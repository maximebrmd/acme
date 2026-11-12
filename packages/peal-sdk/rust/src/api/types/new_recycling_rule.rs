pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct NewRecyclingRule {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub count: Option<i64>,
    pub every: RecyclingInterval,
    #[serde(rename = "postId")]
    #[serde(default)]
    pub post_id: String,
    #[serde(rename = "queueId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub queue_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub until: Option<CalendarDay>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variants: Option<Vec<RecyclingVariant>>,
}

impl NewRecyclingRule {
    pub fn builder() -> NewRecyclingRuleBuilder {
        <NewRecyclingRuleBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct NewRecyclingRuleBuilder {
    count: Option<i64>,
    every: Option<RecyclingInterval>,
    post_id: Option<String>,
    queue_id: Option<String>,
    until: Option<CalendarDay>,
    variants: Option<Vec<RecyclingVariant>>,
}

impl NewRecyclingRuleBuilder {
    pub fn count(mut self, value: i64) -> Self {
        self.count = Some(value);
        self
    }

    pub fn every(mut self, value: RecyclingInterval) -> Self {
        self.every = Some(value);
        self
    }

    pub fn post_id(mut self, value: impl Into<String>) -> Self {
        self.post_id = Some(value.into());
        self
    }

    pub fn queue_id(mut self, value: impl Into<String>) -> Self {
        self.queue_id = Some(value.into());
        self
    }

    pub fn until(mut self, value: CalendarDay) -> Self {
        self.until = Some(value);
        self
    }

    pub fn variants(mut self, value: Vec<RecyclingVariant>) -> Self {
        self.variants = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`NewRecyclingRule`].
    /// This method will fail if any of the following fields are not set:
    /// - [`every`](NewRecyclingRuleBuilder::every)
    /// - [`post_id`](NewRecyclingRuleBuilder::post_id)
    pub fn build(self) -> Result<NewRecyclingRule, BuildError> {
        Ok(NewRecyclingRule {
            count: self.count,
            every: self
                .every
                .ok_or_else(|| BuildError::missing_field("every"))?,
            post_id: self
                .post_id
                .ok_or_else(|| BuildError::missing_field("post_id"))?,
            queue_id: self.queue_id,
            until: self.until,
            variants: self.variants,
        })
    }
}
