pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct LivePostRefusedTarget {
    pub reason: LivePostRefusal,
    #[serde(rename = "targetId")]
    #[serde(default)]
    pub target_id: String,
}

impl LivePostRefusedTarget {
    pub fn builder() -> LivePostRefusedTargetBuilder {
        <LivePostRefusedTargetBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct LivePostRefusedTargetBuilder {
    reason: Option<LivePostRefusal>,
    target_id: Option<String>,
}

impl LivePostRefusedTargetBuilder {
    pub fn reason(mut self, value: LivePostRefusal) -> Self {
        self.reason = Some(value);
        self
    }

    pub fn target_id(mut self, value: impl Into<String>) -> Self {
        self.target_id = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`LivePostRefusedTarget`].
    /// This method will fail if any of the following fields are not set:
    /// - [`reason`](LivePostRefusedTargetBuilder::reason)
    /// - [`target_id`](LivePostRefusedTargetBuilder::target_id)
    pub fn build(self) -> Result<LivePostRefusedTarget, BuildError> {
        Ok(LivePostRefusedTarget {
            reason: self
                .reason
                .ok_or_else(|| BuildError::missing_field("reason"))?,
            target_id: self
                .target_id
                .ok_or_else(|| BuildError::missing_field("target_id"))?,
        })
    }
}
