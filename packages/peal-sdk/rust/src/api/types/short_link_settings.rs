pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ShortLinkSettings {
    #[serde(rename = "byDefault")]
    #[serde(default)]
    pub by_default: bool,
}

impl ShortLinkSettings {
    pub fn builder() -> ShortLinkSettingsBuilder {
        <ShortLinkSettingsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ShortLinkSettingsBuilder {
    by_default: Option<bool>,
}

impl ShortLinkSettingsBuilder {
    pub fn by_default(mut self, value: bool) -> Self {
        self.by_default = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ShortLinkSettings`].
    /// This method will fail if any of the following fields are not set:
    /// - [`by_default`](ShortLinkSettingsBuilder::by_default)
    pub fn build(self) -> Result<ShortLinkSettings, BuildError> {
        Ok(ShortLinkSettings {
            by_default: self
                .by_default
                .ok_or_else(|| BuildError::missing_field("by_default"))?,
        })
    }
}
