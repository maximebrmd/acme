pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct OverviewChannels {
    #[serde(default)]
    pub connected: i64,
    #[serde(default)]
    pub off: i64,
    #[serde(rename = "toReconnect")]
    #[serde(default)]
    pub to_reconnect: i64,
}

impl OverviewChannels {
    pub fn builder() -> OverviewChannelsBuilder {
        <OverviewChannelsBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct OverviewChannelsBuilder {
    connected: Option<i64>,
    off: Option<i64>,
    to_reconnect: Option<i64>,
}

impl OverviewChannelsBuilder {
    pub fn connected(mut self, value: i64) -> Self {
        self.connected = Some(value);
        self
    }

    pub fn off(mut self, value: i64) -> Self {
        self.off = Some(value);
        self
    }

    pub fn to_reconnect(mut self, value: i64) -> Self {
        self.to_reconnect = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`OverviewChannels`].
    /// This method will fail if any of the following fields are not set:
    /// - [`connected`](OverviewChannelsBuilder::connected)
    /// - [`off`](OverviewChannelsBuilder::off)
    /// - [`to_reconnect`](OverviewChannelsBuilder::to_reconnect)
    pub fn build(self) -> Result<OverviewChannels, BuildError> {
        Ok(OverviewChannels {
            connected: self
                .connected
                .ok_or_else(|| BuildError::missing_field("connected"))?,
            off: self.off.ok_or_else(|| BuildError::missing_field("off"))?,
            to_reconnect: self
                .to_reconnect
                .ok_or_else(|| BuildError::missing_field("to_reconnect"))?,
        })
    }
}
