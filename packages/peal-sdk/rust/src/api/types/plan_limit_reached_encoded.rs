pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PlanLimitReachedEncoded {
    #[serde(rename = "_tag")]
    pub tag: PlanLimitReachedEncodedTag,
    #[serde(default)]
    pub allowed: i64,
    pub limit: PlanLimit,
}

impl PlanLimitReachedEncoded {
    pub fn builder() -> PlanLimitReachedEncodedBuilder {
        <PlanLimitReachedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PlanLimitReachedEncodedBuilder {
    tag: Option<PlanLimitReachedEncodedTag>,
    allowed: Option<i64>,
    limit: Option<PlanLimit>,
}

impl PlanLimitReachedEncodedBuilder {
    pub fn tag(mut self, value: PlanLimitReachedEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn allowed(mut self, value: i64) -> Self {
        self.allowed = Some(value);
        self
    }

    pub fn limit(mut self, value: PlanLimit) -> Self {
        self.limit = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PlanLimitReachedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](PlanLimitReachedEncodedBuilder::tag)
    /// - [`allowed`](PlanLimitReachedEncodedBuilder::allowed)
    /// - [`limit`](PlanLimitReachedEncodedBuilder::limit)
    pub fn build(self) -> Result<PlanLimitReachedEncoded, BuildError> {
        Ok(PlanLimitReachedEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            allowed: self
                .allowed
                .ok_or_else(|| BuildError::missing_field("allowed"))?,
            limit: self
                .limit
                .ok_or_else(|| BuildError::missing_field("limit"))?,
        })
    }
}
