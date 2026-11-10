pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct ForbiddenEncoded {
    #[serde(rename = "_tag")]
    pub tag: ForbiddenEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permission: Option<Permission>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<ForbiddenReason>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub scope: Option<String>,
}

impl ForbiddenEncoded {
    pub fn builder() -> ForbiddenEncodedBuilder {
        <ForbiddenEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ForbiddenEncodedBuilder {
    tag: Option<ForbiddenEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    permission: Option<Permission>,
    reason: Option<ForbiddenReason>,
    scope: Option<String>,
}

impl ForbiddenEncodedBuilder {
    pub fn tag(mut self, value: ForbiddenEncodedTag) -> Self {
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

    pub fn permission(mut self, value: Permission) -> Self {
        self.permission = Some(value);
        self
    }

    pub fn reason(mut self, value: ForbiddenReason) -> Self {
        self.reason = Some(value);
        self
    }

    pub fn scope(mut self, value: impl Into<String>) -> Self {
        self.scope = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ForbiddenEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](ForbiddenEncodedBuilder::tag)
    pub fn build(self) -> Result<ForbiddenEncoded, BuildError> {
        Ok(ForbiddenEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            permission: self.permission,
            reason: self.reason,
            scope: self.scope,
        })
    }
}
