pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PartnerOwnsWorkspacesEncoded {
    #[serde(rename = "_tag")]
    pub tag: PartnerOwnsWorkspacesEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub owned: i64,
}

impl PartnerOwnsWorkspacesEncoded {
    pub fn builder() -> PartnerOwnsWorkspacesEncodedBuilder {
        <PartnerOwnsWorkspacesEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerOwnsWorkspacesEncodedBuilder {
    tag: Option<PartnerOwnsWorkspacesEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    owned: Option<i64>,
}

impl PartnerOwnsWorkspacesEncodedBuilder {
    pub fn tag(mut self, value: PartnerOwnsWorkspacesEncodedTag) -> Self {
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

    pub fn owned(mut self, value: i64) -> Self {
        self.owned = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PartnerOwnsWorkspacesEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](PartnerOwnsWorkspacesEncodedBuilder::tag)
    /// - [`owned`](PartnerOwnsWorkspacesEncodedBuilder::owned)
    pub fn build(self) -> Result<PartnerOwnsWorkspacesEncoded, BuildError> {
        Ok(PartnerOwnsWorkspacesEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            owned: self
                .owned
                .ok_or_else(|| BuildError::missing_field("owned"))?,
        })
    }
}
