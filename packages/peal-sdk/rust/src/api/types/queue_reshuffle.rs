pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct QueueReshuffle {
    #[serde(default)]
    pub moved: i64,
    #[serde(default)]
    pub remaining: i64,
    #[serde(rename = "stoppedBy")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub stopped_by: Option<ReshuffleStop>,
    #[serde(default)]
    pub unchanged: i64,
}

impl QueueReshuffle {
    pub fn builder() -> QueueReshuffleBuilder {
        <QueueReshuffleBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct QueueReshuffleBuilder {
    moved: Option<i64>,
    remaining: Option<i64>,
    stopped_by: Option<ReshuffleStop>,
    unchanged: Option<i64>,
}

impl QueueReshuffleBuilder {
    pub fn moved(mut self, value: i64) -> Self {
        self.moved = Some(value);
        self
    }

    pub fn remaining(mut self, value: i64) -> Self {
        self.remaining = Some(value);
        self
    }

    pub fn stopped_by(mut self, value: ReshuffleStop) -> Self {
        self.stopped_by = Some(value);
        self
    }

    pub fn unchanged(mut self, value: i64) -> Self {
        self.unchanged = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`QueueReshuffle`].
    /// This method will fail if any of the following fields are not set:
    /// - [`moved`](QueueReshuffleBuilder::moved)
    /// - [`remaining`](QueueReshuffleBuilder::remaining)
    /// - [`unchanged`](QueueReshuffleBuilder::unchanged)
    pub fn build(self) -> Result<QueueReshuffle, BuildError> {
        Ok(QueueReshuffle {
            moved: self
                .moved
                .ok_or_else(|| BuildError::missing_field("moved"))?,
            remaining: self
                .remaining
                .ok_or_else(|| BuildError::missing_field("remaining"))?,
            stopped_by: self.stopped_by,
            unchanged: self
                .unchanged
                .ok_or_else(|| BuildError::missing_field("unchanged"))?,
        })
    }
}
