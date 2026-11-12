pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PartnerHoldings {
    #[serde(default)]
    pub channels: i64,
    #[serde(default)]
    pub workspaces: i64,
}

impl PartnerHoldings {
    pub fn builder() -> PartnerHoldingsBuilder {
        <PartnerHoldingsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerHoldingsBuilder {
    channels: Option<i64>,
    workspaces: Option<i64>,
}

impl PartnerHoldingsBuilder {
    pub fn channels(mut self, value: i64) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn workspaces(mut self, value: i64) -> Self {
        self.workspaces = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PartnerHoldings`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channels`](PartnerHoldingsBuilder::channels)
    /// - [`workspaces`](PartnerHoldingsBuilder::workspaces)
    pub fn build(self) -> Result<PartnerHoldings, BuildError> {
        Ok(PartnerHoldings {
            channels: self
                .channels
                .ok_or_else(|| BuildError::missing_field("channels"))?,
            workspaces: self
                .workspaces
                .ok_or_else(|| BuildError::missing_field("workspaces"))?,
        })
    }
}
