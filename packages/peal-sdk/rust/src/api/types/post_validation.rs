pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct PostValidation {
    #[serde(rename = "awaitsApproval")]
    #[serde(default)]
    pub awaits_approval: bool,
    #[serde(default)]
    pub channels: Vec<ChannelPreview>,
    #[serde(default)]
    pub duplicates: Vec<DuplicateOnChannel>,
    #[serde(rename = "planLimit")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub plan_limit: Option<PlanShortfall>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub schedule: Option<ScheduleCheck>,
    #[serde(rename = "unknownChannels")]
    #[serde(default)]
    pub unknown_channels: Vec<String>,
    #[serde(rename = "unknownMedia")]
    #[serde(default)]
    pub unknown_media: Vec<String>,
    #[serde(default)]
    pub valid: bool,
    #[serde(default)]
    pub violations: Vec<ContentViolation>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub warnings: Option<Vec<PostWarning>>,
}

impl PostValidation {
    pub fn builder() -> PostValidationBuilder {
        <PostValidationBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PostValidationBuilder {
    awaits_approval: Option<bool>,
    channels: Option<Vec<ChannelPreview>>,
    duplicates: Option<Vec<DuplicateOnChannel>>,
    plan_limit: Option<PlanShortfall>,
    schedule: Option<ScheduleCheck>,
    unknown_channels: Option<Vec<String>>,
    unknown_media: Option<Vec<String>>,
    valid: Option<bool>,
    violations: Option<Vec<ContentViolation>>,
    warnings: Option<Vec<PostWarning>>,
}

impl PostValidationBuilder {
    pub fn awaits_approval(mut self, value: bool) -> Self {
        self.awaits_approval = Some(value);
        self
    }

    pub fn channels(mut self, value: Vec<ChannelPreview>) -> Self {
        self.channels = Some(value);
        self
    }

    pub fn duplicates(mut self, value: Vec<DuplicateOnChannel>) -> Self {
        self.duplicates = Some(value);
        self
    }

    pub fn plan_limit(mut self, value: PlanShortfall) -> Self {
        self.plan_limit = Some(value);
        self
    }

    pub fn schedule(mut self, value: ScheduleCheck) -> Self {
        self.schedule = Some(value);
        self
    }

    pub fn unknown_channels(mut self, value: Vec<String>) -> Self {
        self.unknown_channels = Some(value);
        self
    }

    pub fn unknown_media(mut self, value: Vec<String>) -> Self {
        self.unknown_media = Some(value);
        self
    }

    pub fn valid(mut self, value: bool) -> Self {
        self.valid = Some(value);
        self
    }

    pub fn violations(mut self, value: Vec<ContentViolation>) -> Self {
        self.violations = Some(value);
        self
    }

    pub fn warnings(mut self, value: Vec<PostWarning>) -> Self {
        self.warnings = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PostValidation`].
    /// This method will fail if any of the following fields are not set:
    /// - [`awaits_approval`](PostValidationBuilder::awaits_approval)
    /// - [`channels`](PostValidationBuilder::channels)
    /// - [`duplicates`](PostValidationBuilder::duplicates)
    /// - [`unknown_channels`](PostValidationBuilder::unknown_channels)
    /// - [`unknown_media`](PostValidationBuilder::unknown_media)
    /// - [`valid`](PostValidationBuilder::valid)
    /// - [`violations`](PostValidationBuilder::violations)
    pub fn build(self) -> Result<PostValidation, BuildError> {
        Ok(PostValidation {
            awaits_approval: self
                .awaits_approval
                .ok_or_else(|| BuildError::missing_field("awaits_approval"))?,
            channels: self
                .channels
                .ok_or_else(|| BuildError::missing_field("channels"))?,
            duplicates: self
                .duplicates
                .ok_or_else(|| BuildError::missing_field("duplicates"))?,
            plan_limit: self.plan_limit,
            schedule: self.schedule,
            unknown_channels: self
                .unknown_channels
                .ok_or_else(|| BuildError::missing_field("unknown_channels"))?,
            unknown_media: self
                .unknown_media
                .ok_or_else(|| BuildError::missing_field("unknown_media"))?,
            valid: self
                .valid
                .ok_or_else(|| BuildError::missing_field("valid"))?,
            violations: self
                .violations
                .ok_or_else(|| BuildError::missing_field("violations"))?,
            warnings: self.warnings,
        })
    }
}
