pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct Excess {
    #[serde(default)]
    pub allowed: i64,
    pub limit: HeldLimit,
    #[serde(default)]
    pub used: i64,
}

impl Excess {
    pub fn builder() -> ExcessBuilder {
        <ExcessBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ExcessBuilder {
    allowed: Option<i64>,
    limit: Option<HeldLimit>,
    used: Option<i64>,
}

impl ExcessBuilder {
    pub fn allowed(mut self, value: i64) -> Self {
        self.allowed = Some(value);
        self
    }

    pub fn limit(mut self, value: HeldLimit) -> Self {
        self.limit = Some(value);
        self
    }

    pub fn used(mut self, value: i64) -> Self {
        self.used = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`Excess`].
    /// This method will fail if any of the following fields are not set:
    /// - [`allowed`](ExcessBuilder::allowed)
    /// - [`limit`](ExcessBuilder::limit)
    /// - [`used`](ExcessBuilder::used)
    pub fn build(self) -> Result<Excess, BuildError> {
        Ok(Excess {
            allowed: self
                .allowed
                .ok_or_else(|| BuildError::missing_field("allowed"))?,
            limit: self
                .limit
                .ok_or_else(|| BuildError::missing_field("limit"))?,
            used: self.used.ok_or_else(|| BuildError::missing_field("used"))?,
        })
    }
}
