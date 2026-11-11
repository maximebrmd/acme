pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct Queue {
    #[serde(rename = "channelIds")]
    #[serde(default)]
    pub channel_ids: Vec<String>,
    #[serde(rename = "channelSetId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub channel_set_id: Option<String>,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub id: String,
    #[serde(rename = "isDefault")]
    #[serde(default)]
    pub is_default: bool,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub slots: Vec<QueueSlot>,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
    #[serde(rename = "unavailableChannelIds")]
    #[serde(default)]
    pub unavailable_channel_ids: Vec<String>,
}

impl Queue {
    pub fn builder() -> QueueBuilder {
        <QueueBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct QueueBuilder {
    channel_ids: Option<Vec<String>>,
    channel_set_id: Option<String>,
    created_at: Option<String>,
    id: Option<String>,
    is_default: Option<bool>,
    name: Option<String>,
    slots: Option<Vec<QueueSlot>>,
    time_zone: Option<String>,
    unavailable_channel_ids: Option<Vec<String>>,
}

impl QueueBuilder {
    pub fn channel_ids(mut self, value: Vec<String>) -> Self {
        self.channel_ids = Some(value);
        self
    }

    pub fn channel_set_id(mut self, value: impl Into<String>) -> Self {
        self.channel_set_id = Some(value.into());
        self
    }

    pub fn created_at(mut self, value: impl Into<String>) -> Self {
        self.created_at = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
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

    pub fn unavailable_channel_ids(mut self, value: Vec<String>) -> Self {
        self.unavailable_channel_ids = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`Queue`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_ids`](QueueBuilder::channel_ids)
    /// - [`created_at`](QueueBuilder::created_at)
    /// - [`id`](QueueBuilder::id)
    /// - [`is_default`](QueueBuilder::is_default)
    /// - [`name`](QueueBuilder::name)
    /// - [`slots`](QueueBuilder::slots)
    /// - [`time_zone`](QueueBuilder::time_zone)
    /// - [`unavailable_channel_ids`](QueueBuilder::unavailable_channel_ids)
    pub fn build(self) -> Result<Queue, BuildError> {
        Ok(Queue {
            channel_ids: self
                .channel_ids
                .ok_or_else(|| BuildError::missing_field("channel_ids"))?,
            channel_set_id: self.channel_set_id,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            is_default: self
                .is_default
                .ok_or_else(|| BuildError::missing_field("is_default"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            slots: self
                .slots
                .ok_or_else(|| BuildError::missing_field("slots"))?,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
            unavailable_channel_ids: self
                .unavailable_channel_ids
                .ok_or_else(|| BuildError::missing_field("unavailable_channel_ids"))?,
        })
    }
}
