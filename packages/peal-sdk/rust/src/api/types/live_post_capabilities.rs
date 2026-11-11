pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct LivePostCapabilities {
    #[serde(default)]
    pub edit: bool,
    #[serde(rename = "editBlockedBy")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub edit_blocked_by: Option<LivePostBlocker>,
    #[serde(default)]
    pub unpublish: bool,
    #[serde(rename = "unpublishBlockedBy")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub unpublish_blocked_by: Option<LivePostBlocker>,
}

impl LivePostCapabilities {
    pub fn builder() -> LivePostCapabilitiesBuilder {
        <LivePostCapabilitiesBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct LivePostCapabilitiesBuilder {
    edit: Option<bool>,
    edit_blocked_by: Option<LivePostBlocker>,
    unpublish: Option<bool>,
    unpublish_blocked_by: Option<LivePostBlocker>,
}

impl LivePostCapabilitiesBuilder {
    pub fn edit(mut self, value: bool) -> Self {
        self.edit = Some(value);
        self
    }

    pub fn edit_blocked_by(mut self, value: LivePostBlocker) -> Self {
        self.edit_blocked_by = Some(value);
        self
    }

    pub fn unpublish(mut self, value: bool) -> Self {
        self.unpublish = Some(value);
        self
    }

    pub fn unpublish_blocked_by(mut self, value: LivePostBlocker) -> Self {
        self.unpublish_blocked_by = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`LivePostCapabilities`].
    /// This method will fail if any of the following fields are not set:
    /// - [`edit`](LivePostCapabilitiesBuilder::edit)
    /// - [`unpublish`](LivePostCapabilitiesBuilder::unpublish)
    pub fn build(self) -> Result<LivePostCapabilities, BuildError> {
        Ok(LivePostCapabilities {
            edit: self.edit.ok_or_else(|| BuildError::missing_field("edit"))?,
            edit_blocked_by: self.edit_blocked_by,
            unpublish: self
                .unpublish
                .ok_or_else(|| BuildError::missing_field("unpublish"))?,
            unpublish_blocked_by: self.unpublish_blocked_by,
        })
    }
}
