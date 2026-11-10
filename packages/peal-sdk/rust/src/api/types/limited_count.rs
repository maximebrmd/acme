pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct LimitedCount {
    #[serde(default)]
    pub count: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub maximum: Option<i64>,
}

impl LimitedCount {
    pub fn builder() -> LimitedCountBuilder {
        <LimitedCountBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct LimitedCountBuilder {
    count: Option<i64>,
    maximum: Option<i64>,
}

impl LimitedCountBuilder {
    pub fn count(mut self, value: i64) -> Self {
        self.count = Some(value);
        self
    }

    pub fn maximum(mut self, value: i64) -> Self {
        self.maximum = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`LimitedCount`].
    /// This method will fail if any of the following fields are not set:
    /// - [`count`](LimitedCountBuilder::count)
    pub fn build(self) -> Result<LimitedCount, BuildError> {
        Ok(LimitedCount {
            count: self
                .count
                .ok_or_else(|| BuildError::missing_field("count"))?,
            maximum: self.maximum,
        })
    }
}
