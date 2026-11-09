pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct MediaPage {
    #[serde(default)]
    pub items: Vec<Media>,
    #[serde(rename = "nextCursor")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_cursor: Option<String>,
}

impl MediaPage {
    pub fn builder() -> MediaPageBuilder {
        <MediaPageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaPageBuilder {
    items: Option<Vec<Media>>,
    next_cursor: Option<String>,
}

impl MediaPageBuilder {
    pub fn items(mut self, value: Vec<Media>) -> Self {
        self.items = Some(value);
        self
    }

    pub fn next_cursor(mut self, value: impl Into<String>) -> Self {
        self.next_cursor = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`MediaPage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`items`](MediaPageBuilder::items)
    pub fn build(self) -> Result<MediaPage, BuildError> {
        Ok(MediaPage {
            items: self
                .items
                .ok_or_else(|| BuildError::missing_field("items"))?,
            next_cursor: self.next_cursor,
        })
    }
}
