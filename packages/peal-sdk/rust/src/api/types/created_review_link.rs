pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct CreatedReviewLink {
    pub link: ReviewLink,
    #[serde(default)]
    pub token: String,
    #[serde(default)]
    pub url: String,
}

impl CreatedReviewLink {
    pub fn builder() -> CreatedReviewLinkBuilder {
        <CreatedReviewLinkBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct CreatedReviewLinkBuilder {
    link: Option<ReviewLink>,
    token: Option<String>,
    url: Option<String>,
}

impl CreatedReviewLinkBuilder {
    pub fn link(mut self, value: ReviewLink) -> Self {
        self.link = Some(value);
        self
    }

    pub fn token(mut self, value: impl Into<String>) -> Self {
        self.token = Some(value.into());
        self
    }

    pub fn url(mut self, value: impl Into<String>) -> Self {
        self.url = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`CreatedReviewLink`].
    /// This method will fail if any of the following fields are not set:
    /// - [`link`](CreatedReviewLinkBuilder::link)
    /// - [`token`](CreatedReviewLinkBuilder::token)
    /// - [`url`](CreatedReviewLinkBuilder::url)
    pub fn build(self) -> Result<CreatedReviewLink, BuildError> {
        Ok(CreatedReviewLink {
            link: self.link.ok_or_else(|| BuildError::missing_field("link"))?,
            token: self
                .token
                .ok_or_else(|| BuildError::missing_field("token"))?,
            url: self.url.ok_or_else(|| BuildError::missing_field("url"))?,
        })
    }
}
