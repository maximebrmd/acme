pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct RecyclingInterval {
    #[serde(default)]
    pub count: i64,
    pub unit: RecyclingUnit,
}

impl RecyclingInterval {
    pub fn builder() -> RecyclingIntervalBuilder {
        <RecyclingIntervalBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RecyclingIntervalBuilder {
    count: Option<i64>,
    unit: Option<RecyclingUnit>,
}

impl RecyclingIntervalBuilder {
    pub fn count(mut self, value: i64) -> Self {
        self.count = Some(value);
        self
    }

    pub fn unit(mut self, value: RecyclingUnit) -> Self {
        self.unit = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`RecyclingInterval`].
    /// This method will fail if any of the following fields are not set:
    /// - [`count`](RecyclingIntervalBuilder::count)
    /// - [`unit`](RecyclingIntervalBuilder::unit)
    pub fn build(self) -> Result<RecyclingInterval, BuildError> {
        Ok(RecyclingInterval {
            count: self
                .count
                .ok_or_else(|| BuildError::missing_field("count"))?,
            unit: self.unit.ok_or_else(|| BuildError::missing_field("unit"))?,
        })
    }
}
