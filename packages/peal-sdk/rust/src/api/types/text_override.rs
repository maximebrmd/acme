pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct TextOverride {
    #[serde(rename = "channelId")]
    #[serde(default)]
    pub channel_id: String,
    #[serde(default)]
    pub text: String,
}

impl TextOverride {
    pub fn builder() -> TextOverrideBuilder {
        <TextOverrideBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TextOverrideBuilder {
    channel_id: Option<String>,
    text: Option<String>,
}

impl TextOverrideBuilder {
    pub fn channel_id(mut self, value: impl Into<String>) -> Self {
        self.channel_id = Some(value.into());
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`TextOverride`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_id`](TextOverrideBuilder::channel_id)
    /// - [`text`](TextOverrideBuilder::text)
    pub fn build(self) -> Result<TextOverride, BuildError> {
        Ok(TextOverride {
            channel_id: self
                .channel_id
                .ok_or_else(|| BuildError::missing_field("channel_id"))?,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
