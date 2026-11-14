pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct InboxMessageSettings {
    #[serde(default)]
    pub applications: Vec<InboxMessageApplication>,
    #[serde(default)]
    pub channels: Vec<InboxMessageChannel>,
}

impl InboxMessageSettings {
    pub fn builder() -> InboxMessageSettingsBuilder {
        <InboxMessageSettingsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxMessageSettingsBuilder {
    applications: Option<Vec<InboxMessageApplication>>,
    channels: Option<Vec<InboxMessageChannel>>,
}

impl InboxMessageSettingsBuilder {
    pub fn applications(mut self, value: Vec<InboxMessageApplication>) -> Self {
        self.applications = Some(value);
        self
    }

    pub fn channels(mut self, value: Vec<InboxMessageChannel>) -> Self {
        self.channels = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`InboxMessageSettings`].
    /// This method will fail if any of the following fields are not set:
    /// - [`applications`](InboxMessageSettingsBuilder::applications)
    /// - [`channels`](InboxMessageSettingsBuilder::channels)
    pub fn build(self) -> Result<InboxMessageSettings, BuildError> {
        Ok(InboxMessageSettings {
            applications: self
                .applications
                .ok_or_else(|| BuildError::missing_field("applications"))?,
            channels: self
                .channels
                .ok_or_else(|| BuildError::missing_field("channels"))?,
        })
    }
}
