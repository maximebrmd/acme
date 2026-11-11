pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub struct QueueSlot {
    pub day: Weekday,
    #[serde(default)]
    pub time: SlotTime,
}

impl QueueSlot {
    pub fn builder() -> QueueSlotBuilder {
        <QueueSlotBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct QueueSlotBuilder {
    day: Option<Weekday>,
    time: Option<SlotTime>,
}

impl QueueSlotBuilder {
    pub fn day(mut self, value: Weekday) -> Self {
        self.day = Some(value);
        self
    }

    pub fn time(mut self, value: SlotTime) -> Self {
        self.time = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`QueueSlot`].
    /// This method will fail if any of the following fields are not set:
    /// - [`day`](QueueSlotBuilder::day)
    /// - [`time`](QueueSlotBuilder::time)
    pub fn build(self) -> Result<QueueSlot, BuildError> {
        Ok(QueueSlot {
            day: self.day.ok_or_else(|| BuildError::missing_field("day"))?,
            time: self.time.ok_or_else(|| BuildError::missing_field("time"))?,
        })
    }
}
