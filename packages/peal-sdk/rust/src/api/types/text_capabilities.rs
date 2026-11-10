pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct TextCapabilities {
    #[serde(rename = "forbiddenCharacters")]
    #[serde(default)]
    pub forbidden_characters: Vec<String>,
    #[serde(default)]
    pub limits: Vec<TextLimit>,
    #[serde(rename = "maxHashtags")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_hashtags: Option<i64>,
    #[serde(rename = "maxLinks")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_links: Option<i64>,
    #[serde(rename = "maxMentions")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_mentions: Option<i64>,
}

impl TextCapabilities {
    pub fn builder() -> TextCapabilitiesBuilder {
        <TextCapabilitiesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TextCapabilitiesBuilder {
    forbidden_characters: Option<Vec<String>>,
    limits: Option<Vec<TextLimit>>,
    max_hashtags: Option<i64>,
    max_links: Option<i64>,
    max_mentions: Option<i64>,
}

impl TextCapabilitiesBuilder {
    pub fn forbidden_characters(mut self, value: Vec<String>) -> Self {
        self.forbidden_characters = Some(value);
        self
    }

    pub fn limits(mut self, value: Vec<TextLimit>) -> Self {
        self.limits = Some(value);
        self
    }

    pub fn max_hashtags(mut self, value: i64) -> Self {
        self.max_hashtags = Some(value);
        self
    }

    pub fn max_links(mut self, value: i64) -> Self {
        self.max_links = Some(value);
        self
    }

    pub fn max_mentions(mut self, value: i64) -> Self {
        self.max_mentions = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TextCapabilities`].
    /// This method will fail if any of the following fields are not set:
    /// - [`forbidden_characters`](TextCapabilitiesBuilder::forbidden_characters)
    /// - [`limits`](TextCapabilitiesBuilder::limits)
    pub fn build(self) -> Result<TextCapabilities, BuildError> {
        Ok(TextCapabilities {
            forbidden_characters: self
                .forbidden_characters
                .ok_or_else(|| BuildError::missing_field("forbidden_characters"))?,
            limits: self
                .limits
                .ok_or_else(|| BuildError::missing_field("limits"))?,
            max_hashtags: self.max_hashtags,
            max_links: self.max_links,
            max_mentions: self.max_mentions,
        })
    }
}
