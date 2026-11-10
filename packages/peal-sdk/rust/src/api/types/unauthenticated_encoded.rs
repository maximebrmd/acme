pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct UnauthenticatedEncoded {
    #[serde(rename = "_tag")]
    pub tag: UnauthenticatedEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}

impl UnauthenticatedEncoded {
    pub fn builder() -> UnauthenticatedEncodedBuilder {
        <UnauthenticatedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct UnauthenticatedEncodedBuilder {
    tag: Option<UnauthenticatedEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
}

impl UnauthenticatedEncodedBuilder {
    pub fn tag(mut self, value: UnauthenticatedEncodedTag) -> Self {
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

    /// Consumes the builder and constructs a [`UnauthenticatedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](UnauthenticatedEncodedBuilder::tag)
    pub fn build(self) -> Result<UnauthenticatedEncoded, BuildError> {
        Ok(UnauthenticatedEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
        })
    }
}
