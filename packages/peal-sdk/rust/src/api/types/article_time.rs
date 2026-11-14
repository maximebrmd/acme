pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ArticleTime {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub at: Option<String>,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
}

impl ArticleTime {
    pub fn builder() -> ArticleTimeBuilder {
        <ArticleTimeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ArticleTimeBuilder {
    at: Option<String>,
    time_zone: Option<String>,
}

impl ArticleTimeBuilder {
    pub fn at(mut self, value: impl Into<String>) -> Self {
        self.at = Some(value.into());
        self
    }

    pub fn time_zone(mut self, value: impl Into<String>) -> Self {
        self.time_zone = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`ArticleTime`].
    /// This method will fail if any of the following fields are not set:
    /// - [`time_zone`](ArticleTimeBuilder::time_zone)
    pub fn build(self) -> Result<ArticleTime, BuildError> {
        Ok(ArticleTime {
            at: self.at,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
        })
    }
}
