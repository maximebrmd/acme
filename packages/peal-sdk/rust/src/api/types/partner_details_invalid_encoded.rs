pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PartnerDetailsInvalidEncoded {
    #[serde(rename = "_tag")]
    pub tag: PartnerDetailsInvalidEncodedTag,
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
    field: Option<PartnerDetailField>,
}

impl PartnerDetailsInvalidEncodedBuilder {
    pub fn tag(mut self, value: PartnerDetailsInvalidEncodedTag) -> Self {
        self.tag = Some(value);
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
            field: self
                .field
                .ok_or_else(|| BuildError::missing_field("field"))?,
        })
    }
}
