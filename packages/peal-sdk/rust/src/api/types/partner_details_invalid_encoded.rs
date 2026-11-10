pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PartnerDetailsInvalidEncoded {
    #[serde(rename = "_tag")]
    pub tag: PartnerDetailsInvalidEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    pub field: PartnerDetailField,
}

impl PartnerDetailsInvalidEncoded {
    pub fn builder() -> PartnerDetailsInvalidEncodedBuilder {
        <PartnerDetailsInvalidEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerDetailsInvalidEncodedBuilder {
    tag: Option<PartnerDetailsInvalidEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    field: Option<PartnerDetailField>,
}

impl PartnerDetailsInvalidEncodedBuilder {
    pub fn tag(mut self, value: PartnerDetailsInvalidEncodedTag) -> Self {
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

    pub fn field(mut self, value: PartnerDetailField) -> Self {
        self.field = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PartnerDetailsInvalidEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](PartnerDetailsInvalidEncodedBuilder::tag)
    /// - [`field`](PartnerDetailsInvalidEncodedBuilder::field)
    pub fn build(self) -> Result<PartnerDetailsInvalidEncoded, BuildError> {
        Ok(PartnerDetailsInvalidEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            field: self
                .field
                .ok_or_else(|| BuildError::missing_field("field"))?,
        })
    }
}
