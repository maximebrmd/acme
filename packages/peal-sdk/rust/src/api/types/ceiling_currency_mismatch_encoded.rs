pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct CeilingCurrencyMismatchEncoded {
    #[serde(rename = "_tag")]
    pub tag: CeilingCurrencyMismatchEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(rename = "accountCurrency")]
    #[serde(default)]
    pub account_currency: String,
}

impl CeilingCurrencyMismatchEncoded {
    pub fn builder() -> CeilingCurrencyMismatchEncodedBuilder {
        <CeilingCurrencyMismatchEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CeilingCurrencyMismatchEncodedBuilder {
    tag: Option<CeilingCurrencyMismatchEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    account_currency: Option<String>,
}

impl CeilingCurrencyMismatchEncodedBuilder {
    pub fn tag(mut self, value: CeilingCurrencyMismatchEncodedTag) -> Self {
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

    pub fn account_currency(mut self, value: impl Into<String>) -> Self {
        self.account_currency = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`CeilingCurrencyMismatchEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](CeilingCurrencyMismatchEncodedBuilder::tag)
    /// - [`account_currency`](CeilingCurrencyMismatchEncodedBuilder::account_currency)
    pub fn build(self) -> Result<CeilingCurrencyMismatchEncoded, BuildError> {
        Ok(CeilingCurrencyMismatchEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            account_currency: self
                .account_currency
                .ok_or_else(|| BuildError::missing_field("account_currency"))?,
        })
    }
}
