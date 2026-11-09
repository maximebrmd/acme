pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct ScheduleInPastEncoded {}

impl ScheduleInPastEncoded {
    pub fn builder() -> ScheduleInPastEncodedBuilder {
        <ScheduleInPastEncodedBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ScheduleInPastEncodedBuilder {}

impl ScheduleInPastEncodedBuilder {
    /// Consumes the builder and constructs a [`ScheduleInPastEncoded`].
    pub fn build(self) -> Result<ScheduleInPastEncoded, BuildError> {
        Ok(ScheduleInPastEncoded {})
    }
}
