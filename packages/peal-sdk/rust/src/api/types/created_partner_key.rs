pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct CreatedPartnerKey {
    #[serde(default)]
    pub key: String,
    #[serde(rename = "partnerKey")]
    #[serde(default)]
    pub partner_key: PartnerKey,
}

impl CreatedPartnerKey {
    pub fn builder() -> CreatedPartnerKeyBuilder {
        <CreatedPartnerKeyBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CreatedPartnerKeyBuilder {
    key: Option<String>,
    partner_key: Option<PartnerKey>,
}

impl CreatedPartnerKeyBuilder {
    pub fn key(mut self, value: impl Into<String>) -> Self {
        self.key = Some(value.into());
        self
    }

    pub fn partner_key(mut self, value: PartnerKey) -> Self {
        self.partner_key = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`CreatedPartnerKey`].
    /// This method will fail if any of the following fields are not set:
    /// - [`key`](CreatedPartnerKeyBuilder::key)
    /// - [`partner_key`](CreatedPartnerKeyBuilder::partner_key)
    pub fn build(self) -> Result<CreatedPartnerKey, BuildError> {
        Ok(CreatedPartnerKey {
            key: self.key.ok_or_else(|| BuildError::missing_field("key"))?,
            partner_key: self
                .partner_key
                .ok_or_else(|| BuildError::missing_field("partner_key"))?,
        })
    }
}
