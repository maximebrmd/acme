pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ChannelMove {
    #[serde(rename = "toWorkspaceId")]
    #[serde(default)]
    pub to_workspace_id: String,
}

impl ChannelMove {
    pub fn builder() -> ChannelMoveBuilder {
        <ChannelMoveBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelMoveBuilder {
    to_workspace_id: Option<String>,
}

impl ChannelMoveBuilder {
    pub fn to_workspace_id(mut self, value: impl Into<String>) -> Self {
        self.to_workspace_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ChannelMove`].
    /// This method will fail if any of the following fields are not set:
    /// - [`to_workspace_id`](ChannelMoveBuilder::to_workspace_id)
    pub fn build(self) -> Result<ChannelMove, BuildError> {
        Ok(ChannelMove {
            to_workspace_id: self
                .to_workspace_id
                .ok_or_else(|| BuildError::missing_field("to_workspace_id"))?,
        })
    }
}
