pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ActivityEvent {
    pub actor: ActivityActor,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub application: Option<ActivityApplication>,
    #[serde(rename = "errorCode")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub impersonated: bool,
    #[serde(rename = "objectIds")]
    #[serde(default)]
    pub object_ids: HashMap<String, String>,
    #[serde(rename = "occurredAt")]
    #[serde(default)]
    pub occurred_at: String,
    #[serde(default)]
    pub operation: String,
    #[serde(rename = "requestId")]
    #[serde(skip_serializing_if = "Option::is_none")]
    pub request_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub status: Option<i64>,
    pub via: ActivityVia,
}

impl ActivityEvent {
    pub fn builder() -> ActivityEventBuilder {
        <ActivityEventBuilder as Default>::default()
    }
}

#[derive(Clone, PartialEq, Default, Debug)]
#[non_exhaustive]
pub struct ActivityEventBuilder {
    actor: Option<ActivityActor>,
    application: Option<ActivityApplication>,
    error_code: Option<String>,
    id: Option<String>,
    impersonated: Option<bool>,
    object_ids: Option<HashMap<String, String>>,
    occurred_at: Option<String>,
    operation: Option<String>,
    request_id: Option<String>,
    status: Option<i64>,
    via: Option<ActivityVia>,
}

impl ActivityEventBuilder {
    pub fn actor(mut self, value: ActivityActor) -> Self {
        self.actor = Some(value);
        self
    }

    pub fn application(mut self, value: ActivityApplication) -> Self {
        self.application = Some(value);
        self
    }

    pub fn error_code(mut self, value: impl Into<String>) -> Self {
        self.error_code = Some(value.into());
        self
    }

    pub fn id(mut self, value: impl Into<String>) -> Self {
        self.id = Some(value.into());
        self
    }

    pub fn impersonated(mut self, value: bool) -> Self {
        self.impersonated = Some(value);
        self
    }

    pub fn object_ids(mut self, value: HashMap<String, String>) -> Self {
        self.object_ids = Some(value);
        self
    }

    pub fn occurred_at(mut self, value: impl Into<String>) -> Self {
        self.occurred_at = Some(value.into());
        self
    }

    pub fn operation(mut self, value: impl Into<String>) -> Self {
        self.operation = Some(value.into());
        self
    }

    pub fn request_id(mut self, value: impl Into<String>) -> Self {
        self.request_id = Some(value.into());
        self
    }

    pub fn status(mut self, value: i64) -> Self {
        self.status = Some(value);
        self
    }

    pub fn via(mut self, value: ActivityVia) -> Self {
        self.via = Some(value);
        self
    }

    /// Consumes the builder and constructs a [`ActivityEvent`].
    /// This method will fail if any of the following fields are not set:
    /// - [`actor`](ActivityEventBuilder::actor)
    /// - [`id`](ActivityEventBuilder::id)
    /// - [`impersonated`](ActivityEventBuilder::impersonated)
    /// - [`object_ids`](ActivityEventBuilder::object_ids)
    /// - [`occurred_at`](ActivityEventBuilder::occurred_at)
    /// - [`operation`](ActivityEventBuilder::operation)
    /// - [`via`](ActivityEventBuilder::via)
    pub fn build(self) -> Result<ActivityEvent, BuildError> {
        Ok(ActivityEvent {
            actor: self
                .actor
                .ok_or_else(|| BuildError::missing_field("actor"))?,
            application: self.application,
            error_code: self.error_code,
            id: self.id.ok_or_else(|| BuildError::missing_field("id"))?,
            impersonated: self
                .impersonated
                .ok_or_else(|| BuildError::missing_field("impersonated"))?,
            object_ids: self
                .object_ids
                .ok_or_else(|| BuildError::missing_field("object_ids"))?,
            occurred_at: self
                .occurred_at
                .ok_or_else(|| BuildError::missing_field("occurred_at"))?,
            operation: self
                .operation
                .ok_or_else(|| BuildError::missing_field("operation"))?,
            request_id: self.request_id,
            status: self.status,
            via: self.via.ok_or_else(|| BuildError::missing_field("via"))?,
        })
    }
}
