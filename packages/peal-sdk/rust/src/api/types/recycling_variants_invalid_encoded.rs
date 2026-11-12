pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct RecyclingVariantsInvalidEncoded {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub variants: Vec<RecyclingVariantsInvalidEncodedVariantsItem>,
}

impl RecyclingVariantsInvalidEncoded {
    pub fn builder() -> RecyclingVariantsInvalidEncodedBuilder {
        <RecyclingVariantsInvalidEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RecyclingVariantsInvalidEncodedBuilder {
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    variants: Option<Vec<RecyclingVariantsInvalidEncodedVariantsItem>>,
}

impl RecyclingVariantsInvalidEncodedBuilder {
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

    pub fn variants(mut self, value: Vec<RecyclingVariantsInvalidEncodedVariantsItem>) -> Self {
        self.variants = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`RecyclingVariantsInvalidEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`variants`](RecyclingVariantsInvalidEncodedBuilder::variants)
    pub fn build(self) -> Result<RecyclingVariantsInvalidEncoded, BuildError> {
        Ok(RecyclingVariantsInvalidEncoded {
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            variants: self
                .variants
                .ok_or_else(|| BuildError::missing_field("variants"))?,
        })
    }
}
