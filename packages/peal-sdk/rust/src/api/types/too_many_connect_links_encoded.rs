pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct TooManyConnectLinksEncoded {
    #[serde(rename = "_tag")]
    pub tag: TooManyConnectLinksEncodedTag,
    #[serde(default)]
    pub allowed: i64,
}

impl TooManyConnectLinksEncoded {
    pub fn builder() -> TooManyConnectLinksEncodedBuilder {
        <TooManyConnectLinksEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct TooManyConnectLinksEncodedBuilder {
    tag: Option<TooManyConnectLinksEncodedTag>,
    allowed: Option<i64>,
}

impl TooManyConnectLinksEncodedBuilder {
    pub fn tag(mut self, value: TooManyConnectLinksEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn allowed(mut self, value: i64) -> Self {
        self.allowed = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`TooManyConnectLinksEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](TooManyConnectLinksEncodedBuilder::tag)
    /// - [`allowed`](TooManyConnectLinksEncodedBuilder::allowed)
    pub fn build(self) -> Result<TooManyConnectLinksEncoded, BuildError> {
        Ok(TooManyConnectLinksEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            allowed: self
                .allowed
                .ok_or_else(|| BuildError::missing_field("allowed"))?,
        })
    }
}
