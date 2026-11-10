pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ApiChangelog {
    #[serde(default)]
    pub entries: Vec<ApiChangelogEntry>,
}

impl ApiChangelog {
    pub fn builder() -> ApiChangelogBuilder {
        <ApiChangelogBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ApiChangelogBuilder {
    entries: Option<Vec<ApiChangelogEntry>>,
}

impl ApiChangelogBuilder {
    pub fn entries(mut self, value: Vec<ApiChangelogEntry>) -> Self {
        self.entries = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ApiChangelog`].
    /// This method will fail if any of the following fields are not set:
    /// - [`entries`](ApiChangelogBuilder::entries)
    pub fn build(self) -> Result<ApiChangelog, BuildError> {
        Ok(ApiChangelog {
            entries: self
                .entries
                .ok_or_else(|| BuildError::missing_field("entries"))?,
        })
    }
}
