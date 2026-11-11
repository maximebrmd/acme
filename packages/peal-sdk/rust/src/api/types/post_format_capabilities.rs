pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct PostFormatCapabilities {
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub media: MediaCapabilities,
    #[serde(default)]
    pub name: String,
    #[serde(rename = "sendsText")]
    #[serde(default)]
    pub sends_text: bool,
}

impl PostFormatCapabilities {
    pub fn builder() -> PostFormatCapabilitiesBuilder {
        <PostFormatCapabilitiesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostFormatCapabilitiesBuilder {
    description: Option<String>,
    media: Option<MediaCapabilities>,
    name: Option<String>,
    sends_text: Option<bool>,
}

impl PostFormatCapabilitiesBuilder {
    pub fn description(mut self, value: impl Into<String>) -> Self {
        self.description = Some(value.into());
        self
    }

    pub fn media(mut self, value: MediaCapabilities) -> Self {
        self.media = Some(value);
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn sends_text(mut self, value: bool) -> Self {
        self.sends_text = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostFormatCapabilities`].
    /// This method will fail if any of the following fields are not set:
    /// - [`description`](PostFormatCapabilitiesBuilder::description)
    /// - [`media`](PostFormatCapabilitiesBuilder::media)
    /// - [`name`](PostFormatCapabilitiesBuilder::name)
    /// - [`sends_text`](PostFormatCapabilitiesBuilder::sends_text)
    pub fn build(self) -> Result<PostFormatCapabilities, BuildError> {
        Ok(PostFormatCapabilities {
            description: self
                .description
                .ok_or_else(|| BuildError::missing_field("description"))?,
            media: self
                .media
                .ok_or_else(|| BuildError::missing_field("media"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            sends_text: self
                .sends_text
                .ok_or_else(|| BuildError::missing_field("sends_text"))?,
        })
    }
}
