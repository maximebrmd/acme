pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct DeletionIncompleteEncoded {
    #[serde(rename = "_tag")]
    pub tag: DeletionIncompleteEncodedTag,
    #[serde(rename = "subscriptionsCancelled")]
    #[serde(default)]
    pub subscriptions_cancelled: i64,
}

impl DeletionIncompleteEncoded {
    pub fn builder() -> DeletionIncompleteEncodedBuilder {
        <DeletionIncompleteEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct DeletionIncompleteEncodedBuilder {
    tag: Option<DeletionIncompleteEncodedTag>,
    subscriptions_cancelled: Option<i64>,
}

impl DeletionIncompleteEncodedBuilder {
    pub fn tag(mut self, value: DeletionIncompleteEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn subscriptions_cancelled(mut self, value: i64) -> Self {
        self.subscriptions_cancelled = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`DeletionIncompleteEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](DeletionIncompleteEncodedBuilder::tag)
    /// - [`subscriptions_cancelled`](DeletionIncompleteEncodedBuilder::subscriptions_cancelled)
    pub fn build(self) -> Result<DeletionIncompleteEncoded, BuildError> {
        Ok(DeletionIncompleteEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            subscriptions_cancelled: self
                .subscriptions_cancelled
                .ok_or_else(|| BuildError::missing_field("subscriptions_cancelled"))?,
        })
    }
}
