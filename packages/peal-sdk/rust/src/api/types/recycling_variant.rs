pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RecyclingVariant {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub overrides: Option<Vec<TextOverride>>,
    #[serde(default)]
    pub text: String,
}

impl RecyclingVariant {
    pub fn builder() -> RecyclingVariantBuilder {
        <RecyclingVariantBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RecyclingVariantBuilder {
    overrides: Option<Vec<TextOverride>>,
    text: Option<String>,
}

impl RecyclingVariantBuilder {
    pub fn overrides(mut self, value: Vec<TextOverride>) -> Self {
        self.overrides = Some(value);
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`RecyclingVariant`].
    /// This method will fail if any of the following fields are not set:
    /// - [`text`](RecyclingVariantBuilder::text)
    pub fn build(self) -> Result<RecyclingVariant, BuildError> {
        Ok(RecyclingVariant {
            overrides: self.overrides,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
