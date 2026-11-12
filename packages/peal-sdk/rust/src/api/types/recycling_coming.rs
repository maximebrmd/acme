pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct RecyclingComing {
    #[serde(default)]
    pub at: String,
    #[serde(default)]
    pub occurrence: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub variant: Option<i64>,
}

impl RecyclingComing {
    pub fn builder() -> RecyclingComingBuilder {
        <RecyclingComingBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct RecyclingComingBuilder {
    at: Option<String>,
    occurrence: Option<i64>,
    variant: Option<i64>,
}

impl RecyclingComingBuilder {
    pub fn at(mut self, value: impl Into<String>) -> Self {
        self.at = Some(value.into());
        self
    }

    pub fn occurrence(mut self, value: i64) -> Self {
        self.occurrence = Some(value);
        self
    }

    pub fn variant(mut self, value: i64) -> Self {
        self.variant = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`RecyclingComing`].
    /// This method will fail if any of the following fields are not set:
    /// - [`at`](RecyclingComingBuilder::at)
    /// - [`occurrence`](RecyclingComingBuilder::occurrence)
    pub fn build(self) -> Result<RecyclingComing, BuildError> {
        Ok(RecyclingComing {
            at: self.at.ok_or_else(|| BuildError::missing_field("at"))?,
            occurrence: self
                .occurrence
                .ok_or_else(|| BuildError::missing_field("occurrence"))?,
            variant: self.variant,
        })
    }
}
