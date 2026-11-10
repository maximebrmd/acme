pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, Default, PartialEq, Eq, Hash)]
pub struct FollowerChange {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gained: Option<i64>,
}

impl FollowerChange {
    pub fn builder() -> FollowerChangeBuilder {
        <FollowerChangeBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct FollowerChangeBuilder {
    current: Option<i64>,
    gained: Option<i64>,
}

impl FollowerChangeBuilder {
    pub fn current(mut self, value: i64) -> Self {
        self.current = Some(value);
        self
    }

    pub fn gained(mut self, value: i64) -> Self {
        self.gained = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`FollowerChange`].
    pub fn build(self) -> Result<FollowerChange, BuildError> {
        Ok(FollowerChange {
            current: self.current,
            gained: self.gained,
        })
    }
}
