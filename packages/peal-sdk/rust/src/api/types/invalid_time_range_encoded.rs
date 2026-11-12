pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InvalidTimeRangeEncoded {
    #[serde(rename = "_tag")]
    pub tag: InvalidTimeRangeEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
}

impl InvalidTimeRangeEncoded {
    pub fn builder() -> InvalidTimeRangeEncodedBuilder {
        <InvalidTimeRangeEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InvalidTimeRangeEncodedBuilder {
    tag: Option<InvalidTimeRangeEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
}

impl InvalidTimeRangeEncodedBuilder {
    pub fn tag(mut self, value: InvalidTimeRangeEncodedTag) -> Self {
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

    /// Consumes the builder and constructs a [`InvalidTimeRangeEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](InvalidTimeRangeEncodedBuilder::tag)
    pub fn build(self) -> Result<InvalidTimeRangeEncoded, BuildError> {
        Ok(InvalidTimeRangeEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
        })
    }
}
