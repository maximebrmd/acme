pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ExternalIdTakenEncoded {
    #[serde(rename = "_tag")]
    pub tag: ExternalIdTakenEncodedTag,
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

impl ExternalIdTakenEncoded {
    pub fn builder() -> ExternalIdTakenEncodedBuilder {
        <ExternalIdTakenEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ExternalIdTakenEncodedBuilder {
    tag: Option<ExternalIdTakenEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    workspace_id: Option<String>,
}

impl ExternalIdTakenEncodedBuilder {
    pub fn tag(mut self, value: ExternalIdTakenEncodedTag) -> Self {
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

    /// Consumes the builder and constructs a [`ExternalIdTakenEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](ExternalIdTakenEncodedBuilder::tag)
    /// - [`workspace_id`](ExternalIdTakenEncodedBuilder::workspace_id)
    pub fn build(self) -> Result<ExternalIdTakenEncoded, BuildError> {
        Ok(ExternalIdTakenEncoded {
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
