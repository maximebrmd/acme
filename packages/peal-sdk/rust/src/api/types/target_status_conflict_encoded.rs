pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct TargetStatusConflictEncoded {
    pub status: PostTargetStatus,
}

impl TargetStatusConflictEncoded {
    pub fn builder() -> TargetStatusConflictEncodedBuilder {
        <TargetStatusConflictEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TargetStatusConflictEncodedBuilder {
    status: Option<PostTargetStatus>,
}

impl TargetStatusConflictEncodedBuilder {
    pub fn status(mut self, value: PostTargetStatus) -> Self {
        self.status = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TargetStatusConflictEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`status`](TargetStatusConflictEncodedBuilder::status)
    pub fn build(self) -> Result<TargetStatusConflictEncoded, BuildError> {
        Ok(TargetStatusConflictEncoded {
            status: self
                .status
                .ok_or_else(|| BuildError::missing_field("status"))?,
        })
    }
}
