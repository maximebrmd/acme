pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RecyclingRuleChange {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub count: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub paused: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub until: Option<CalendarDay>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variants: Option<Vec<RecyclingVariant>>,
}

impl RecyclingRuleChange {
    pub fn builder() -> RecyclingRuleChangeBuilder {
        <RecyclingRuleChangeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RecyclingRuleChangeBuilder {
    count: Option<i64>,
    paused: Option<bool>,
    until: Option<CalendarDay>,
    variants: Option<Vec<RecyclingVariant>>,
}

impl RecyclingRuleChangeBuilder {
    pub fn count(mut self, value: i64) -> Self {
        self.count = Some(value);
        self
    }

    pub fn paused(mut self, value: bool) -> Self {
        self.paused = Some(value);
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

    /// Consumes the builder and constructs a [`RecyclingRuleChange`].
    pub fn build(self) -> Result<RecyclingRuleChange, BuildError> {
        Ok(RecyclingRuleChange {
            count: self.count,
            paused: self.paused,
            until: self.until,
            variants: self.variants,
        })
    }
}
