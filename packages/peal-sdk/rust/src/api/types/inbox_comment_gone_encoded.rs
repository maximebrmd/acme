pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct InboxCommentGoneEncoded {
    #[serde(rename = "_tag")]
    pub tag: InboxCommentGoneEncodedTag,
}

impl InboxCommentGoneEncoded {
    pub fn builder() -> InboxCommentGoneEncodedBuilder {
        <InboxCommentGoneEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct InboxCommentGoneEncodedBuilder {
    tag: Option<InboxCommentGoneEncodedTag>,
}

impl InboxCommentGoneEncodedBuilder {
    pub fn tag(mut self, value: InboxCommentGoneEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`InboxCommentGoneEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](InboxCommentGoneEncodedBuilder::tag)
    pub fn build(self) -> Result<InboxCommentGoneEncoded, BuildError> {
        Ok(InboxCommentGoneEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
        })
    }
}
