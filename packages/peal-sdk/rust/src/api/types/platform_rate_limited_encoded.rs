pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PlatformRateLimitedEncoded {
    #[serde(rename = "_tag")]
    pub tag: PlatformRateLimitedEncodedTag,
    #[serde(rename = "retryAfterSeconds")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub retry_after_seconds: Option<i64>,
}

impl PlatformRateLimitedEncoded {
    pub fn builder() -> PlatformRateLimitedEncodedBuilder {
        <PlatformRateLimitedEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PlatformRateLimitedEncodedBuilder {
    tag: Option<PlatformRateLimitedEncodedTag>,
    retry_after_seconds: Option<i64>,
}

impl PlatformRateLimitedEncodedBuilder {
    pub fn tag(mut self, value: PlatformRateLimitedEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn retry_after_seconds(mut self, value: i64) -> Self {
        self.retry_after_seconds = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PlatformRateLimitedEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](PlatformRateLimitedEncodedBuilder::tag)
    pub fn build(self) -> Result<PlatformRateLimitedEncoded, BuildError> {
        Ok(PlatformRateLimitedEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            retry_after_seconds: self.retry_after_seconds,
        })
    }
}
