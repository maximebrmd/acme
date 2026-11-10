pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct LinkedInMention {
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub urn: String,
}

impl LinkedInMention {
    pub fn builder() -> LinkedInMentionBuilder {
        <LinkedInMentionBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct LinkedInMentionBuilder {
    name: Option<String>,
    urn: Option<String>,
}

impl LinkedInMentionBuilder {
    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn urn(mut self, value: impl Into<String>) -> Self {
        self.urn = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`LinkedInMention`].
    /// This method will fail if any of the following fields are not set:
    /// - [`name`](LinkedInMentionBuilder::name)
    /// - [`urn`](LinkedInMentionBuilder::urn)
    pub fn build(self) -> Result<LinkedInMention, BuildError> {
        Ok(LinkedInMention {
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            urn: self.urn.ok_or_else(|| BuildError::missing_field("urn"))?,
        })
    }
}
