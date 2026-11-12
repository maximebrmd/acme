pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum UnprocessableEntityErrorBody {
    #[non_exhaustive]
    FeedAddressRefused {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        reason: FeedAddressRefusedEncodedReason,
    },

    #[non_exhaustive]
    FeedTemplateInvalid {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        placeholder: Option<String>,
        reason: FeedTemplateInvalidEncodedReason,
    },

    #[non_exhaustive]
    FeedUnreadable {
        #[serde(skip_serializing_if = "Option::is_none")]
        code: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        message: Option<String>,
        #[serde(rename = "requestId")]
        #[serde(skip_serializing_if = "Option::is_none")]
        request_id: Option<String>,
        reason: FeedUnreadableEncodedReason,
    },

    #[non_exhaustive]
    UnknownChannels {
        #[serde(flatten)]
        data: UnknownChannelsEncoded,
    },

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl UnprocessableEntityErrorBody {
    pub fn feed_address_refused(reason: FeedAddressRefusedEncodedReason) -> Self {
        Self::FeedAddressRefused {
            code: None,
            message: None,
            request_id: None,
            reason,
        }
    }

    pub fn feed_template_invalid(reason: FeedTemplateInvalidEncodedReason) -> Self {
        Self::FeedTemplateInvalid {
            code: None,
            message: None,
            request_id: None,
            placeholder: None,
            reason,
        }
    }

    pub fn feed_unreadable(reason: FeedUnreadableEncodedReason) -> Self {
        Self::FeedUnreadable {
            code: None,
            message: None,
            request_id: None,
            reason,
        }
    }

    pub fn unknown_channels(data: UnknownChannelsEncoded) -> Self {
        Self::UnknownChannels { data }
    }

    pub fn feed_address_refused_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        reason: FeedAddressRefusedEncodedReason,
    ) -> Self {
        Self::FeedAddressRefused {
            code: Some(code),
            message,
            request_id,
            reason,
        }
    }

    pub fn feed_address_refused_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        reason: FeedAddressRefusedEncodedReason,
    ) -> Self {
        Self::FeedAddressRefused {
            code,
            message: Some(message),
            request_id,
            reason,
        }
    }

    pub fn feed_address_refused_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        reason: FeedAddressRefusedEncodedReason,
    ) -> Self {
        Self::FeedAddressRefused {
            code,
            message,
            request_id: Some(request_id),
            reason,
        }
    }

    pub fn feed_template_invalid_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        placeholder: Option<String>,
        reason: FeedTemplateInvalidEncodedReason,
    ) -> Self {
        Self::FeedTemplateInvalid {
            code: Some(code),
            message,
            request_id,
            placeholder,
            reason,
        }
    }

    pub fn feed_template_invalid_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        placeholder: Option<String>,
        reason: FeedTemplateInvalidEncodedReason,
    ) -> Self {
        Self::FeedTemplateInvalid {
            code,
            message: Some(message),
            request_id,
            placeholder,
            reason,
        }
    }

    pub fn feed_template_invalid_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        placeholder: Option<String>,
        reason: FeedTemplateInvalidEncodedReason,
    ) -> Self {
        Self::FeedTemplateInvalid {
            code,
            message,
            request_id: Some(request_id),
            placeholder,
            reason,
        }
    }

    pub fn feed_template_invalid_with_placeholder(
        code: Option<String>,
        message: Option<String>,
        request_id: Option<String>,
        placeholder: String,
        reason: FeedTemplateInvalidEncodedReason,
    ) -> Self {
        Self::FeedTemplateInvalid {
            code,
            message,
            request_id,
            placeholder: Some(placeholder),
            reason,
        }
    }

    pub fn feed_unreadable_with_code(
        code: String,
        message: Option<String>,
        request_id: Option<String>,
        reason: FeedUnreadableEncodedReason,
    ) -> Self {
        Self::FeedUnreadable {
            code: Some(code),
            message,
            request_id,
            reason,
        }
    }

    pub fn feed_unreadable_with_message(
        code: Option<String>,
        message: String,
        request_id: Option<String>,
        reason: FeedUnreadableEncodedReason,
    ) -> Self {
        Self::FeedUnreadable {
            code,
            message: Some(message),
            request_id,
            reason,
        }
    }

    pub fn feed_unreadable_with_request_id(
        code: Option<String>,
        message: Option<String>,
        request_id: String,
        reason: FeedUnreadableEncodedReason,
    ) -> Self {
        Self::FeedUnreadable {
            code,
            message,
            request_id: Some(request_id),
            reason,
        }
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
