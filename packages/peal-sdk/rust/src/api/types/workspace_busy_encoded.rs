pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct WorkspaceBusyEncoded {
    #[serde(rename = "_tag")]
    pub tag: WorkspaceBusyEncodedTag,
    #[serde(rename = "workspaceId")]
    #[serde(default)]
    pub workspace_id: String,
}

impl WorkspaceBusyEncoded {
    pub fn builder() -> WorkspaceBusyEncodedBuilder {
        <WorkspaceBusyEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct WorkspaceBusyEncodedBuilder {
    tag: Option<WorkspaceBusyEncodedTag>,
    workspace_id: Option<String>,
}

impl WorkspaceBusyEncodedBuilder {
    pub fn tag(mut self, value: WorkspaceBusyEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn workspace_id(mut self, value: impl Into<String>) -> Self {
        self.workspace_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`WorkspaceBusyEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](WorkspaceBusyEncodedBuilder::tag)
    /// - [`workspace_id`](WorkspaceBusyEncodedBuilder::workspace_id)
    pub fn build(self) -> Result<WorkspaceBusyEncoded, BuildError> {
        Ok(WorkspaceBusyEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            workspace_id: self
                .workspace_id
                .ok_or_else(|| BuildError::missing_field("workspace_id"))?,
        })
    }
}
