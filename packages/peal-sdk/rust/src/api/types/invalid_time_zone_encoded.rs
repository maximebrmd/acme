pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InvalidTimeZoneEncoded {
    #[serde(rename = "_tag")]
    pub tag: InvalidTimeZoneEncodedTag,
    #[serde(rename = "timeZone")]
    #[serde(default)]
    pub time_zone: String,
}

impl InvalidTimeZoneEncoded {
    pub fn builder() -> InvalidTimeZoneEncodedBuilder {
        <InvalidTimeZoneEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InvalidTimeZoneEncodedBuilder {
    tag: Option<InvalidTimeZoneEncodedTag>,
    time_zone: Option<String>,
}

impl InvalidTimeZoneEncodedBuilder {
    pub fn tag(mut self, value: InvalidTimeZoneEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn time_zone(mut self, value: impl Into<String>) -> Self {
        self.time_zone = Some(value.into());
        self
    }

    /// Consumes the builder and constructs a [`InvalidTimeZoneEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](InvalidTimeZoneEncodedBuilder::tag)
    /// - [`time_zone`](InvalidTimeZoneEncodedBuilder::time_zone)
    pub fn build(self) -> Result<InvalidTimeZoneEncoded, BuildError> {
        Ok(InvalidTimeZoneEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
        })
    }
}
