pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InvalidTimeZoneEncoded {
    #[serde(rename = "_tag")]
    pub tag: InvalidTimeZoneEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
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
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    time_zone: Option<String>,
}

impl InvalidTimeZoneEncodedBuilder {
    pub fn tag(mut self, value: InvalidTimeZoneEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
        self
    }

    pub fn message(mut self, value: impl Into<String>) -> Self {
        self.message = Some(value.into());
        self
    }

    pub fn request_id(mut self, value: impl Into<String>) -> Self {
        self.request_id = Some(value.into());
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
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            time_zone: self
                .time_zone
                .ok_or_else(|| BuildError::missing_field("time_zone"))?,
        })
    }
}
