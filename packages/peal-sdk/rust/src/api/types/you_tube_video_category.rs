pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct YouTubeVideoCategory {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub title: String,
}

impl YouTubeVideoCategory {
    pub fn builder() -> YouTubeVideoCategoryBuilder {
        <YouTubeVideoCategoryBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct YouTubeVideoCategoryBuilder {
    id: Option<String>,
    title: Option<String>,
}

impl YouTubeVideoCategoryBuilder {
    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn title(mut self, value: impl Into<String>) -> Self {
        self.title = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`YouTubeVideoCategory`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](YouTubeVideoCategoryBuilder::id)
    /// - [`title`](YouTubeVideoCategoryBuilder::title)
    pub fn build(self) -> Result<YouTubeVideoCategory, BuildError> {
        Ok(YouTubeVideoCategory {
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            title: self
                .title
                .ok_or_else(|| BuildError::missing_field("title"))?,
        })
    }
}
