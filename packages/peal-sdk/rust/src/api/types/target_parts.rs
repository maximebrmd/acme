pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct TargetParts {
    #[serde(default)]
    pub count: i64,
    #[serde(default)]
    pub live: Vec<LivePart>,
}

impl TargetParts {
    pub fn builder() -> TargetPartsBuilder {
        <TargetPartsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TargetPartsBuilder {
    count: Option<i64>,
    live: Option<Vec<LivePart>>,
}

impl TargetPartsBuilder {
    pub fn count(mut self, value: i64) -> Self {
        self.count = Some(value);
        self
    }

    pub fn live(mut self, value: Vec<LivePart>) -> Self {
        self.live = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TargetParts`].
    /// This method will fail if any of the following fields are not set:
    /// - [`count`](TargetPartsBuilder::count)
    /// - [`live`](TargetPartsBuilder::live)
    pub fn build(self) -> Result<TargetParts, BuildError> {
        Ok(TargetParts {
            count: self
                .count
                .ok_or_else(|| BuildError::missing_field("count"))?,
            live: self.live.ok_or_else(|| BuildError::missing_field("live"))?,
        })
    }
}
