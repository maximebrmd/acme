pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct BreakingChange {
    #[serde(default)]
    pub change: String,
    #[serde(default)]
    pub reason: String,
}

impl BreakingChange {
    pub fn builder() -> BreakingChangeBuilder {
        <BreakingChangeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BreakingChangeBuilder {
    change: Option<String>,
    reason: Option<String>,
}

impl BreakingChangeBuilder {
    pub fn change(mut self, value: impl Into<String>) -> Self {
        self.change = Some(value.into());
        self
    }

    pub fn reason(mut self, value: impl Into<String>) -> Self {
        self.reason = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`BreakingChange`].
    /// This method will fail if any of the following fields are not set:
    /// - [`change`](BreakingChangeBuilder::change)
    /// - [`reason`](BreakingChangeBuilder::reason)
    pub fn build(self) -> Result<BreakingChange, BuildError> {
        Ok(BreakingChange {
            change: self
                .change
                .ok_or_else(|| BuildError::missing_field("change"))?,
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
        })
    }
}
