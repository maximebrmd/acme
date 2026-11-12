pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ShortLinkStatus {
    #[serde(default)]
    pub available: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub base: Option<String>,
    #[serde(rename = "byDefault")]
    #[serde(default)]
    pub by_default: bool,
    #[serde(rename = "shortLength")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub short_length: Option<i64>,
}

impl ShortLinkStatus {
    pub fn builder() -> ShortLinkStatusBuilder {
        <ShortLinkStatusBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ShortLinkStatusBuilder {
    available: Option<bool>,
    base: Option<String>,
    by_default: Option<bool>,
    short_length: Option<i64>,
}

impl ShortLinkStatusBuilder {
    pub fn available(mut self, value: bool) -> Self {
        self.available = Some(value);
        self
    }

    pub fn base(mut self, value: impl Into<String>) -> Self {
        self.base = Some(value.into());
        self
    }

    pub fn by_default(mut self, value: bool) -> Self {
        self.by_default = Some(value);
        self
    }

    pub fn short_length(mut self, value: i64) -> Self {
        self.short_length = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ShortLinkStatus`].
    /// This method will fail if any of the following fields are not set:
    /// - [`available`](ShortLinkStatusBuilder::available)
    /// - [`by_default`](ShortLinkStatusBuilder::by_default)
    pub fn build(self) -> Result<ShortLinkStatus, BuildError> {
        Ok(ShortLinkStatus {
            available: self
                .available
                .ok_or_else(|| BuildError::missing_field("available"))?,
            base: self.base,
            by_default: self
                .by_default
                .ok_or_else(|| BuildError::missing_field("by_default"))?,
            short_length: self.short_length,
        })
    }
}
