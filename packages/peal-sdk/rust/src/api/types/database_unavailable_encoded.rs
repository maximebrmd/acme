pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct DatabaseUnavailableEncoded {
    #[serde(rename = "_tag")]
    pub tag: DatabaseUnavailableEncodedTag,
}

impl DatabaseUnavailableEncoded {
    pub fn builder() -> DatabaseUnavailableEncodedBuilder {
        <DatabaseUnavailableEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct DatabaseUnavailableEncodedBuilder {
    tag: Option<DatabaseUnavailableEncodedTag>,
}

impl DatabaseUnavailableEncodedBuilder {
    pub fn tag(mut self, value: DatabaseUnavailableEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`DatabaseUnavailableEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](DatabaseUnavailableEncodedBuilder::tag)
    pub fn build(self) -> Result<DatabaseUnavailableEncoded, BuildError> {
        Ok(DatabaseUnavailableEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
