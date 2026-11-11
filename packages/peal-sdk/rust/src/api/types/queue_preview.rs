pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct QueuePreview {
    #[serde(rename = "nextFree")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_free: Option<String>,
    #[serde(rename = "noRoom")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub no_room: Option<QueueNoRoom>,
    #[serde(default)]
    pub slots: Vec<PreviewSlot>,
}

impl QueuePreview {
    pub fn builder() -> QueuePreviewBuilder {
        <QueuePreviewBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct QueuePreviewBuilder {
    next_free: Option<String>,
    no_room: Option<QueueNoRoom>,
    slots: Option<Vec<PreviewSlot>>,
}

impl QueuePreviewBuilder {
    pub fn next_free(mut self, value: impl Into<String>) -> Self {
        self.next_free = Some(value.into());
        self
    }

    pub fn no_room(mut self, value: QueueNoRoom) -> Self {
        self.no_room = Some(value);
        self
    }

    pub fn slots(mut self, value: Vec<PreviewSlot>) -> Self {
        self.slots = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`QueuePreview`].
    /// This method will fail if any of the following fields are not set:
    /// - [`slots`](QueuePreviewBuilder::slots)
    pub fn build(self) -> Result<QueuePreview, BuildError> {
        Ok(QueuePreview {
            next_free: self.next_free,
            no_room: self.no_room,
            slots: self
                .slots
                .ok_or_else(|| BuildError::missing_field("slots"))?,
        })
    }
}
