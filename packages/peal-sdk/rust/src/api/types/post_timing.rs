pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum PostTiming {
    #[serde(rename = "now")]
    #[non_exhaustive]
    Now {
        #[serde(rename = "timeZone")]
        #[serde(skip_serializing_if = "Option::is_none")]
        time_zone: Option<String>,
    },

    #[serde(rename = "at")]
    #[non_exhaustive]
    At {
        #[serde(default)]
        at: String,
        #[serde(rename = "timeZone")]
        #[serde(default)]
        time_zone: String,
    },

    #[serde(rename = "queue")]
    #[non_exhaustive]
    Queue {
        #[serde(rename = "queueId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        queue_id: Option<String>,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl PostTiming {
    pub fn now() -> Self {
        Self::Now { time_zone: None }
    }

    pub fn at(at: String, time_zone: String) -> Self {
        Self::At { at, time_zone }
    }

    pub fn queue() -> Self {
        Self::Queue { queue_id: None }
    }

    pub fn now_with_time_zone(time_zone: String) -> Self {
        Self::Now {
            time_zone: Some(time_zone),
        }
    }

    pub fn queue_with_queue_id(queue_id: String) -> Self {
        Self::Queue {
            queue_id: Some(queue_id),
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
