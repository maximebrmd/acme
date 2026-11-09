pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct TikTokAccount {
    pub posting: TikTokAccountPosting,
    #[serde(rename = "takesPhotos")]
    #[serde(default)]
    pub takes_photos: bool,
}

impl TikTokAccount {
    pub fn builder() -> TikTokAccountBuilder {
        <TikTokAccountBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TikTokAccountBuilder {
    posting: Option<TikTokAccountPosting>,
    takes_photos: Option<bool>,
}

impl TikTokAccountBuilder {
    pub fn posting(mut self, value: TikTokAccountPosting) -> Self {
        self.posting = Some(value);
        self
    }

    pub fn takes_photos(mut self, value: bool) -> Self {
        self.takes_photos = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TikTokAccount`].
    /// This method will fail if any of the following fields are not set:
    /// - [`posting`](TikTokAccountBuilder::posting)
    /// - [`takes_photos`](TikTokAccountBuilder::takes_photos)
    pub fn build(self) -> Result<TikTokAccount, BuildError> {
        Ok(TikTokAccount {
            posting: self
                .posting
                .ok_or_else(|| BuildError::missing_field("posting"))?,
            takes_photos: self
                .takes_photos
                .ok_or_else(|| BuildError::missing_field("takes_photos"))?,
        })
    }
}
