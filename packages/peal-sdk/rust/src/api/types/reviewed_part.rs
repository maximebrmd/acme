pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ReviewedPart {
    #[serde(rename = "delaySeconds")]
    #[serde(default)]
    pub delay_seconds: i64,
    #[serde(default)]
    pub media: Vec<ReviewedMedia>,
    #[serde(default)]
    pub text: String,
}

impl ReviewedPart {
    pub fn builder() -> ReviewedPartBuilder {
        <ReviewedPartBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ReviewedPartBuilder {
    delay_seconds: Option<i64>,
    media: Option<Vec<ReviewedMedia>>,
    text: Option<String>,
}

impl ReviewedPartBuilder {
    pub fn delay_seconds(mut self, value: i64) -> Self {
        self.delay_seconds = Some(value);
        self
    }

    pub fn media(mut self, value: Vec<ReviewedMedia>) -> Self {
        self.media = Some(value);
        self
    }

    pub fn text(mut self, value: impl Into<String>) -> Self {
        self.text = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ReviewedPart`].
    /// This method will fail if any of the following fields are not set:
    /// - [`delay_seconds`](ReviewedPartBuilder::delay_seconds)
    /// - [`media`](ReviewedPartBuilder::media)
    /// - [`text`](ReviewedPartBuilder::text)
    pub fn build(self) -> Result<ReviewedPart, BuildError> {
        Ok(ReviewedPart {
            delay_seconds: self
                .delay_seconds
                .ok_or_else(|| BuildError::missing_field("delay_seconds"))?,
            media: self
                .media
                .ok_or_else(|| BuildError::missing_field("media"))?,
            text: self.text.ok_or_else(|| BuildError::missing_field("text"))?,
        })
    }
}
