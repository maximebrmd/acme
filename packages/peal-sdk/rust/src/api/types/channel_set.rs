pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq)]
pub struct ChannelSet {
    #[serde(rename = "channelIds")]
    #[serde(default)]
    pub channel_ids: Vec<String>,
    #[serde(rename = "createdAt")]
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub options: Vec<ChannelOptions>,
    #[serde(rename = "unavailableChannelIds")]
    #[serde(default)]
    pub unavailable_channel_ids: Vec<String>,
}

impl ChannelSet {
    pub fn builder() -> ChannelSetBuilder {
        <ChannelSetBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ChannelSetBuilder {
    channel_ids: Option<Vec<String>>,
    created_at: Option<String>,
    id: Option<String>,
    name: Option<String>,
    options: Option<Vec<ChannelOptions>>,
    unavailable_channel_ids: Option<Vec<String>>,
}

impl ChannelSetBuilder {
    pub fn channel_ids(mut self, value: Vec<String>) -> Self {
        self.channel_ids = Some(value);
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

    pub fn name(mut self, value: impl Into<String>) -> Self {
        self.name = Some(value.into());
        self
    }

    pub fn options(mut self, value: Vec<ChannelOptions>) -> Self {
        self.options = Some(value);
        self
    }

    pub fn unavailable_channel_ids(mut self, value: Vec<String>) -> Self {
        self.unavailable_channel_ids = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ChannelSet`].
    /// This method will fail if any of the following fields are not set:
    /// - [`channel_ids`](ChannelSetBuilder::channel_ids)
    /// - [`created_at`](ChannelSetBuilder::created_at)
    /// - [`id`](ChannelSetBuilder::id)
    /// - [`name`](ChannelSetBuilder::name)
    /// - [`options`](ChannelSetBuilder::options)
    /// - [`unavailable_channel_ids`](ChannelSetBuilder::unavailable_channel_ids)
    pub fn build(self) -> Result<ChannelSet, BuildError> {
        Ok(ChannelSet {
            channel_ids: self
                .channel_ids
                .ok_or_else(|| BuildError::missing_field("channel_ids"))?,
            created_at: self
                .created_at
                .ok_or_else(|| BuildError::missing_field("created_at"))?,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            name: self.name.ok_or_else(|| BuildError::missing_field("name"))?,
            options: self
                .options
                .ok_or_else(|| BuildError::missing_field("options"))?,
            unavailable_channel_ids: self
                .unavailable_channel_ids
                .ok_or_else(|| BuildError::missing_field("unavailable_channel_ids"))?,
        })
    }
}
