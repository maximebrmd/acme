pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct YouTubePlaylist {
    #[serde(default)]
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub privacy: Option<String>,
    #[serde(default)]
    pub title: String,
}

impl YouTubePlaylist {
    pub fn builder() -> YouTubePlaylistBuilder {
        <YouTubePlaylistBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct YouTubePlaylistBuilder {
    id: Option<String>,
    privacy: Option<String>,
    title: Option<String>,
}

impl YouTubePlaylistBuilder {
    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn privacy(mut self, value: impl Into<String>) -> Self {
        self.privacy = Some(value.into());
        self
    }

    pub fn title(mut self, value: impl Into<String>) -> Self {
        self.title = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`YouTubePlaylist`].
    /// This method will fail if any of the following fields are not set:
    /// - [`id`](YouTubePlaylistBuilder::id)
    /// - [`title`](YouTubePlaylistBuilder::title)
    pub fn build(self) -> Result<YouTubePlaylist, BuildError> {
        Ok(YouTubePlaylist {
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            privacy: self.privacy,
            title: self
                .title
                .ok_or_else(|| BuildError::missing_field("title"))?,
        })
    }
}
