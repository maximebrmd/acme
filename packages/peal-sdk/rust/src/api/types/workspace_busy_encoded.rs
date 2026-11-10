pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct WorkspaceBusyEncoded {
    #[serde(rename = "_tag")]
    pub tag: WorkspaceBusyEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
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
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    workspace_id: Option<String>,
}

impl WorkspaceBusyEncodedBuilder {
    pub fn tag(mut self, value: WorkspaceBusyEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
        self
    }

    pub fn message(mut self, value: impl Into<String>) -> Self {
        self.message = Some(value.into());
        self
    }

    pub fn request_id(mut self, value: impl Into<String>) -> Self {
        self.request_id = Some(value.into());
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
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            workspace_id: self
                .workspace_id
                .ok_or_else(|| BuildError::missing_field("workspace_id"))?,
        })
    }
}
