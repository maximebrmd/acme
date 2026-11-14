pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct MediaUsage {
    #[serde(default)]
    pub drafts: Vec<String>,
    #[serde(default)]
    pub scheduled: Vec<String>,
    #[serde(rename = "draftArticles")]
    #[serde(default)]
    pub draft_articles: Vec<String>,
    #[serde(rename = "scheduledArticles")]
    #[serde(default)]
    pub scheduled_articles: Vec<String>,
}

impl MediaUsage {
    pub fn builder() -> MediaUsageBuilder {
        <MediaUsageBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct MediaUsageBuilder {
    drafts: Option<Vec<String>>,
    scheduled: Option<Vec<String>>,
    draft_articles: Option<Vec<String>>,
    scheduled_articles: Option<Vec<String>>,
}

impl MediaUsageBuilder {
    pub fn drafts(mut self, value: Vec<String>) -> Self {
        self.drafts = Some(value);
        self
    }

    pub fn scheduled(mut self, value: Vec<String>) -> Self {
        self.scheduled = Some(value);
        self
    }

    pub fn draft_articles(mut self, value: Vec<String>) -> Self {
        self.draft_articles = Some(value);
        self
    }

    pub fn scheduled_articles(mut self, value: Vec<String>) -> Self {
        self.scheduled_articles = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`MediaUsage`].
    /// This method will fail if any of the following fields are not set:
    /// - [`drafts`](MediaUsageBuilder::drafts)
    /// - [`scheduled`](MediaUsageBuilder::scheduled)
    /// - [`draft_articles`](MediaUsageBuilder::draft_articles)
    /// - [`scheduled_articles`](MediaUsageBuilder::scheduled_articles)
    pub fn build(self) -> Result<MediaUsage, BuildError> {
        Ok(MediaUsage {
            drafts: self
                .drafts
                .ok_or_else(|| BuildError::missing_field("drafts"))?,
            scheduled: self
                .scheduled
                .ok_or_else(|| BuildError::missing_field("scheduled"))?,
            draft_articles: self
                .draft_articles
                .ok_or_else(|| BuildError::missing_field("draft_articles"))?,
            scheduled_articles: self
                .scheduled_articles
                .ok_or_else(|| BuildError::missing_field("scheduled_articles"))?,
        })
    }
}
