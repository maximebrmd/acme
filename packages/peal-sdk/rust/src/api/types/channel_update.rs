pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ChannelUpdate {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub label: Option<String>,
}

impl ChannelUpdate {
    pub fn builder() -> ChannelUpdateBuilder {
        <ChannelUpdateBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelUpdateBuilder {
    label: Option<String>,
}

impl ChannelUpdateBuilder {
    pub fn label(mut self, value: impl Into<String>) -> Self {
        self.label = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ChannelUpdate`].
    pub fn build(self) -> Result<ChannelUpdate, BuildError> {
        Ok(ChannelUpdate { label: self.label })
    }
}
