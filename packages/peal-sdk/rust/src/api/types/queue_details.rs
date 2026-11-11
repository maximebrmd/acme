pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct QueueDetails {
    #[serde(rename = "channelIds")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_ids: Option<Vec<String>>,
    #[serde(rename = "channelSetId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_set_id: Option<String>,
    #[serde(rename = "isDefault")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub is_default: Option<bool>,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub slots: Vec<QueueSlot>,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
}

impl QueueDetails {
    pub fn builder() -> QueueDetailsBuilder {
        <QueueDetailsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct QueueDetailsBuilder {
    channel_ids: Option<Vec<String>>,
    channel_set_id: Option<String>,
    is_default: Option<bool>,
    name: Option<String>,
    slots: Option<Vec<QueueSlot>>,
    time_zone: Option<String>,
}

impl QueueDetailsBuilder {
    pub fn channel_ids(mut self, value: Vec<String>) -> Self {
        self.channel_ids = Some(value);
        self
    }

    pub fn channel_set_id(mut self, value: impl Into<String>) -> Self {
        self.channel_set_id = Some(value.into());
        self
    }

    pub fn is_default(mut self, value: bool) -> Self {
        self.is_default = Some(value);
        self
    }

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn slots(mut self, value: Vec<QueueSlot>) -> Self {
        self.slots = Some(value);
        self
    }

    pub fn time_zone(mut self, value: impl Into<String>) -> Self {
        self.time_zone = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`QueueDetails`].
    /// This method will fail if any of the following fields are not set:
    /// - [`name`](QueueDetailsBuilder::name)
    /// - [`slots`](QueueDetailsBuilder::slots)
    /// - [`time_zone`](QueueDetailsBuilder::time_zone)
    pub fn build(self) -> Result<QueueDetails, BuildError> {
        Ok(QueueDetails {
            channel_ids: self.channel_ids,
            channel_set_id: self.channel_set_id,
            is_default: self.is_default,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            slots: self
                .slots
                .ok_or_else(|| BuildError::missing_field("slots"))?,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
        })
    }
}
