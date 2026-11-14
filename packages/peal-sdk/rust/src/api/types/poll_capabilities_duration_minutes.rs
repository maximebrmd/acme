pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct PollCapabilitiesDurationMinutes {
    #[serde(default)]
    pub maximum: i64,
    #[serde(default)]
    pub minimum: i64,
}

impl PollCapabilitiesDurationMinutes {
    pub fn builder() -> PollCapabilitiesDurationMinutesBuilder {
        <PollCapabilitiesDurationMinutesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PollCapabilitiesDurationMinutesBuilder {
    maximum: Option<i64>,
    minimum: Option<i64>,
}

impl PollCapabilitiesDurationMinutesBuilder {
    pub fn maximum(mut self, value: i64) -> Self {
        self.maximum = Some(value);
        self
    }

    pub fn minimum(mut self, value: i64) -> Self {
        self.minimum = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PollCapabilitiesDurationMinutes`].
    /// This method will fail if any of the following fields are not set:
    /// - [`maximum`](PollCapabilitiesDurationMinutesBuilder::maximum)
    /// - [`minimum`](PollCapabilitiesDurationMinutesBuilder::minimum)
    pub fn build(self) -> Result<PollCapabilitiesDurationMinutes, BuildError> {
        Ok(PollCapabilitiesDurationMinutes {
            maximum: self
                .maximum
                .ok_or_else(|| BuildError::missing_field("maximum"))?,
            minimum: self
                .minimum
                .ok_or_else(|| BuildError::missing_field("minimum"))?,
        })
    }
}
