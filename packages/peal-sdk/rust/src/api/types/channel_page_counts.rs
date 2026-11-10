pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ChannelPageCounts {
    #[serde(default)]
    pub active: i64,
    #[serde(default)]
    pub disabled: i64,
    #[serde(rename = "refreshNeeded")]
    #[serde(default)]
    pub refresh_needed: i64,
}

impl ChannelPageCounts {
    pub fn builder() -> ChannelPageCountsBuilder {
        <ChannelPageCountsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelPageCountsBuilder {
    active: Option<i64>,
    disabled: Option<i64>,
    refresh_needed: Option<i64>,
}

impl ChannelPageCountsBuilder {
    pub fn active(mut self, value: i64) -> Self {
        self.active = Some(value);
        self
    }

    pub fn disabled(mut self, value: i64) -> Self {
        self.disabled = Some(value);
        self
    }

    pub fn refresh_needed(mut self, value: i64) -> Self {
        self.refresh_needed = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ChannelPageCounts`].
    /// This method will fail if any of the following fields are not set:
    /// - [`active`](ChannelPageCountsBuilder::active)
    /// - [`disabled`](ChannelPageCountsBuilder::disabled)
    /// - [`refresh_needed`](ChannelPageCountsBuilder::refresh_needed)
    pub fn build(self) -> Result<ChannelPageCounts, BuildError> {
        Ok(ChannelPageCounts {
            active: self
                .active
                .ok_or_else(|| BuildError::missing_field("active"))?,
            disabled: self
                .disabled
                .ok_or_else(|| BuildError::missing_field("disabled"))?,
            refresh_needed: self
                .refresh_needed
                .ok_or_else(|| BuildError::missing_field("refresh_needed"))?,
        })
    }
}
