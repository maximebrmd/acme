pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Poll {
    #[serde(default)]
    pub choices: Vec<String>,
    #[serde(rename = "durationMinutes")]
    #[serde(default)]
    pub duration_minutes: i64,
    #[serde(rename = "multipleChoice")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub multiple_choice: Option<bool>,
}

impl Poll {
    pub fn builder() -> PollBuilder {
        <PollBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PollBuilder {
    choices: Option<Vec<String>>,
    duration_minutes: Option<i64>,
    multiple_choice: Option<bool>,
}

impl PollBuilder {
    pub fn choices(mut self, value: Vec<String>) -> Self {
        self.choices = Some(value);
        self
    }

    pub fn duration_minutes(mut self, value: i64) -> Self {
        self.duration_minutes = Some(value);
        self
    }

    pub fn multiple_choice(mut self, value: bool) -> Self {
        self.multiple_choice = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`Poll`].
    /// This method will fail if any of the following fields are not set:
    /// - [`choices`](PollBuilder::choices)
    /// - [`duration_minutes`](PollBuilder::duration_minutes)
    pub fn build(self) -> Result<Poll, BuildError> {
        Ok(Poll {
            choices: self
                .choices
                .ok_or_else(|| BuildError::missing_field("choices"))?,
            duration_minutes: self
                .duration_minutes
                .ok_or_else(|| BuildError::missing_field("duration_minutes"))?,
            multiple_choice: self.multiple_choice,
        })
    }
}
