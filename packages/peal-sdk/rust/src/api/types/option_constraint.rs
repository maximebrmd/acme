pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum OptionConstraint {
    #[serde(rename = "needsOneOf")]
    #[non_exhaustive]
    NeedsOneOf {
        #[serde(default)]
        field: String,
        #[serde(rename = "oneOf")]
        #[serde(default)]
        one_of: Vec<String>,
    },

    #[serde(rename = "notWith")]
    #[non_exhaustive]
    NotWith {
        #[serde(default)]
        field: String,
        #[serde(default)]
        other: String,
        #[serde(default)]
        value: String,
    },

    #[serde(rename = "neededWith")]
    #[non_exhaustive]
    NeededWith {
        #[serde(default)]
        field: String,
        #[serde(default)]
        other: String,
        #[serde(default)]
        values: Vec<String>,
    },

    #[serde(rename = "onlyWith")]
    #[non_exhaustive]
    OnlyWith {
        #[serde(default)]
        field: String,
        #[serde(default)]
        other: String,
        #[serde(default)]
        values: Vec<String>,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl OptionConstraint {
    pub fn needs_one_of(field: String, one_of: Vec<String>) -> Self {
        Self::NeedsOneOf { field, one_of }
    }

    pub fn not_with(field: String, other: String, value: String) -> Self {
        Self::NotWith {
            field,
            other,
            value,
        }
    }

    pub fn needed_with(field: String, other: String, values: Vec<String>) -> Self {
        Self::NeededWith {
            field,
            other,
            values,
        }
    }

    pub fn only_with(field: String, other: String, values: Vec<String>) -> Self {
        Self::OnlyWith {
            field,
            other,
            values,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
