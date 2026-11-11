pub use crate::prelude::*;

#[non_exhaustive]
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum ReshuffleStop {
    PlanLimit,
    Full,
    Changed,
    /// This variant is used for forward compatibility.
    /// If the server sends a value not recognized by the current SDK version,
    /// it will be captured here with the raw string value.
    __Unknown(String),
}
impl Serialize for ReshuffleStop {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        match self {
            Self::PlanLimit => serializer.serialize_str("planLimit"),
            Self::Full => serializer.serialize_str("full"),
            Self::Changed => serializer.serialize_str("changed"),
            Self::__Unknown(val) => serializer.serialize_str(val),
        }
    }
}

impl<'de> Deserialize<'de> for ReshuffleStop {
    fn deserialize<D: serde::Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
        let value = String::deserialize(deserializer)?;
        match value.as_str() {
            "planLimit" => Ok(Self::PlanLimit),
            "full" => Ok(Self::Full),
            "changed" => Ok(Self::Changed),
            _ => Ok(Self::__Unknown(value)),
        }
    }
}

impl fmt::Display for ReshuffleStop {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::PlanLimit => write!(f, "planLimit"),
            Self::Full => write!(f, "full"),
            Self::Changed => write!(f, "changed"),
            Self::__Unknown(val) => write!(f, "{}", val),
        }
    }
}
