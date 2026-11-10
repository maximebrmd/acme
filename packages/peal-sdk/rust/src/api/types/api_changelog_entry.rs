pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ApiChangelogEntry {
    #[serde(default)]
    pub additions: i64,
    #[serde(default)]
    pub breaking: Vec<BreakingChange>,
    #[serde(default)]
    pub date: String,
    #[serde(default)]
    pub deprecations: Vec<String>,
    #[serde(default)]
    pub operations: Vec<String>,
    #[serde(default)]
    pub title: String,
}

impl ApiChangelogEntry {
    pub fn builder() -> ApiChangelogEntryBuilder {
        <ApiChangelogEntryBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ApiChangelogEntryBuilder {
    additions: Option<i64>,
    breaking: Option<Vec<BreakingChange>>,
    date: Option<String>,
    deprecations: Option<Vec<String>>,
    operations: Option<Vec<String>>,
    title: Option<String>,
}

impl ApiChangelogEntryBuilder {
    pub fn additions(mut self, value: i64) -> Self {
        self.additions = Some(value);
        self
    }

    pub fn breaking(mut self, value: Vec<BreakingChange>) -> Self {
        self.breaking = Some(value);
        self
    }

    pub fn date(mut self, value: impl Into<String>) -> Self {
        self.date = Some(value.into());
        self
    }

    pub fn deprecations(mut self, value: Vec<String>) -> Self {
        self.deprecations = Some(value);
        self
    }

    pub fn operations(mut self, value: Vec<String>) -> Self {
        self.operations = Some(value);
        self
    }

    pub fn title(mut self, value: impl Into<String>) -> Self {
        self.title = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ApiChangelogEntry`].
    /// This method will fail if any of the following fields are not set:
    /// - [`additions`](ApiChangelogEntryBuilder::additions)
    /// - [`breaking`](ApiChangelogEntryBuilder::breaking)
    /// - [`date`](ApiChangelogEntryBuilder::date)
    /// - [`deprecations`](ApiChangelogEntryBuilder::deprecations)
    /// - [`operations`](ApiChangelogEntryBuilder::operations)
    /// - [`title`](ApiChangelogEntryBuilder::title)
    pub fn build(self) -> Result<ApiChangelogEntry, BuildError> {
        Ok(ApiChangelogEntry {
            additions: self
                .additions
                .ok_or_else(|| BuildError::missing_field("additions"))?,
            breaking: self
                .breaking
                .ok_or_else(|| BuildError::missing_field("breaking"))?,
            date: self.date.ok_or_else(|| BuildError::missing_field("date"))?,
            deprecations: self
                .deprecations
                .ok_or_else(|| BuildError::missing_field("deprecations"))?,
            operations: self
                .operations
                .ok_or_else(|| BuildError::missing_field("operations"))?,
            title: self
                .title
                .ok_or_else(|| BuildError::missing_field("title"))?,
        })
    }
}
