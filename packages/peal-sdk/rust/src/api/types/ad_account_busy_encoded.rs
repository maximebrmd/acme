pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct AdAccountBusyEncoded {
    #[serde(rename = "_tag")]
    pub tag: AdAccountBusyEncodedTag,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(default)]
    pub boosts: i64,
}

impl AdAccountBusyEncoded {
    pub fn builder() -> AdAccountBusyEncodedBuilder {
        <AdAccountBusyEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct AdAccountBusyEncodedBuilder {
    tag: Option<AdAccountBusyEncodedTag>,
    code: Option<String>,
    message: Option<String>,
    request_id: Option<String>,
    boosts: Option<i64>,
}

impl AdAccountBusyEncodedBuilder {
    pub fn tag(mut self, value: AdAccountBusyEncodedTag) -> Self {
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

    pub fn boosts(mut self, value: i64) -> Self {
        self.boosts = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`AdAccountBusyEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](AdAccountBusyEncodedBuilder::tag)
    /// - [`boosts`](AdAccountBusyEncodedBuilder::boosts)
    pub fn build(self) -> Result<AdAccountBusyEncoded, BuildError> {
        Ok(AdAccountBusyEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            code: self.code,
            message: self.message,
            request_id: self.request_id,
            boosts: self
                .boosts
                .ok_or_else(|| BuildError::missing_field("boosts"))?,
        })
    }
}
