pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct SignatureNameTakenEncoded {
    #[serde(rename = "_tag")]
    pub tag: SignatureNameTakenEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}

impl SignatureNameTakenEncoded {
    pub fn builder() -> SignatureNameTakenEncodedBuilder {
        <SignatureNameTakenEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct SignatureNameTakenEncodedBuilder {
    tag: Option<SignatureNameTakenEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
}

impl SignatureNameTakenEncodedBuilder {
    pub fn tag(mut self, value: SignatureNameTakenEncodedTag) -> Self {
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

    /// Consumes the builder and constructs a [`SignatureNameTakenEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](SignatureNameTakenEncodedBuilder::tag)
    pub fn build(self) -> Result<SignatureNameTakenEncoded, BuildError> {
        Ok(SignatureNameTakenEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
        })
    }
}
