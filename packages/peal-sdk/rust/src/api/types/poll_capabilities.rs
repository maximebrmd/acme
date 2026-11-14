pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PollCapabilities {
    #[serde(rename = "choiceLimit")]
    pub choice_limit: TextLimit,
    #[serde(rename = "durationMinutes")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_minutes: Option<PollCapabilitiesDurationMinutes>,
    #[serde(rename = "maxChoices")]
    #[serde(default)]
    pub max_choices: i64,
    #[serde(rename = "minChoices")]
    #[serde(default)]
    pub min_choices: i64,
    #[serde(rename = "multipleChoice")]
    #[serde(default)]
    pub multiple_choice: bool,
}

impl PollCapabilities {
    pub fn builder() -> PollCapabilitiesBuilder {
        <PollCapabilitiesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PollCapabilitiesBuilder {
    choice_limit: Option<TextLimit>,
    duration_minutes: Option<PollCapabilitiesDurationMinutes>,
    max_choices: Option<i64>,
    min_choices: Option<i64>,
    multiple_choice: Option<bool>,
}

impl PollCapabilitiesBuilder {
    pub fn choice_limit(mut self, value: TextLimit) -> Self {
        self.choice_limit = Some(value);
        self
    }

    pub fn duration_minutes(mut self, value: PollCapabilitiesDurationMinutes) -> Self {
        self.duration_minutes = Some(value);
        self
    }

    pub fn max_choices(mut self, value: i64) -> Self {
        self.max_choices = Some(value);
        self
    }

    pub fn min_choices(mut self, value: i64) -> Self {
        self.min_choices = Some(value);
        self
    }

    pub fn multiple_choice(mut self, value: bool) -> Self {
        self.multiple_choice = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PollCapabilities`].
    /// This method will fail if any of the following fields are not set:
    /// - [`choice_limit`](PollCapabilitiesBuilder::choice_limit)
    /// - [`max_choices`](PollCapabilitiesBuilder::max_choices)
    /// - [`min_choices`](PollCapabilitiesBuilder::min_choices)
    /// - [`multiple_choice`](PollCapabilitiesBuilder::multiple_choice)
    pub fn build(self) -> Result<PollCapabilities, BuildError> {
        Ok(PollCapabilities {
            choice_limit: self
                .choice_limit
                .ok_or_else(|| BuildError::missing_field("choice_limit"))?,
            duration_minutes: self.duration_minutes,
            max_choices: self
                .max_choices
                .ok_or_else(|| BuildError::missing_field("max_choices"))?,
            min_choices: self
                .min_choices
                .ok_or_else(|| BuildError::missing_field("min_choices"))?,
            multiple_choice: self
                .multiple_choice
                .ok_or_else(|| BuildError::missing_field("multiple_choice"))?,
        })
    }
}
