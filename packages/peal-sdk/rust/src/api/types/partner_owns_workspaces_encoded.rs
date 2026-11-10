pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct PartnerOwnsWorkspacesEncoded {
    #[serde(rename = "_tag")]
    pub tag: PartnerOwnsWorkspacesEncodedTag,
    #[serde(default)]
    pub owned: i64,
}

impl PartnerOwnsWorkspacesEncoded {
    pub fn builder() -> PartnerOwnsWorkspacesEncodedBuilder {
        <PartnerOwnsWorkspacesEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct PartnerOwnsWorkspacesEncodedBuilder {
    tag: Option<PartnerOwnsWorkspacesEncodedTag>,
    owned: Option<i64>,
}

impl PartnerOwnsWorkspacesEncodedBuilder {
    pub fn tag(mut self, value: PartnerOwnsWorkspacesEncodedTag) -> Self {
        self.tag = Some(value);
        self
    }

    pub fn owned(mut self, value: i64) -> Self {
        self.owned = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`PartnerOwnsWorkspacesEncoded`].
    /// This method will fail if any of the following fields are not set:
    /// - [`tag`](PartnerOwnsWorkspacesEncodedBuilder::tag)
    /// - [`owned`](PartnerOwnsWorkspacesEncodedBuilder::owned)
    pub fn build(self) -> Result<PartnerOwnsWorkspacesEncoded, BuildError> {
        Ok(PartnerOwnsWorkspacesEncoded {
            tag: self.tag.ok_or_else(|| BuildError::missing_field("tag"))?,
            owned: self
                .owned
                .ok_or_else(|| BuildError::missing_field("owned"))?,
        })
    }
}
