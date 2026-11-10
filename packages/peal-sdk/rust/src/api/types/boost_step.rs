pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct BoostStep {
    #[serde(rename = "finishedAt")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub finished_at: Option<String>,
    #[serde(rename = "networkCode")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub network_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub outcome: Option<BoostStepOutcome>,
    #[serde(rename = "startedAt")]
    #[serde(default)]
    pub started_at: String,
    pub step: BoostStepStep,
}

impl BoostStep {
    pub fn builder() -> BoostStepBuilder {
        <BoostStepBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct BoostStepBuilder {
    finished_at: Option<String>,
    network_code: Option<String>,
    outcome: Option<BoostStepOutcome>,
    started_at: Option<String>,
    step: Option<BoostStepStep>,
}

impl BoostStepBuilder {
    pub fn finished_at(mut self, value: impl Into<String>) -> Self {
        self.finished_at = Some(value.into());
        self
    }

    pub fn network_code(mut self, value: impl Into<String>) -> Self {
        self.network_code = Some(value.into());
        self
    }

    pub fn outcome(mut self, value: BoostStepOutcome) -> Self {
        self.outcome = Some(value);
        self
    }

    pub fn started_at(mut self, value: impl Into<String>) -> Self {
        self.started_at = Some(value.into());
        self
    }

    pub fn step(mut self, value: BoostStepStep) -> Self {
        self.step = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`BoostStep`].
    /// This method will fail if any of the following fields are not set:
    /// - [`started_at`](BoostStepBuilder::started_at)
    /// - [`step`](BoostStepBuilder::step)
    pub fn build(self) -> Result<BoostStep, BuildError> {
        Ok(BoostStep {
            finished_at: self.finished_at,
            network_code: self.network_code,
            outcome: self.outcome,
            started_at: self
                .started_at
                .ok_or_else(|| BuildError::missing_field("started_at"))?,
            step: self.step.ok_or_else(|| BuildError::missing_field("step"))?,
        })
    }
}
