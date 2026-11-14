pub use crate::prelude::*;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "_tag")]
#[non_exhaustive]
pub enum ArticleViolation {
    #[serde(rename = "titleMissing")]
    #[non_exhaustive]
    TitleMissing {},

    #[serde(rename = "titleTooLong")]
    #[non_exhaustive]
    TitleTooLong {
        #[serde(default)]
        maximum: i64,
    },

    #[serde(rename = "bodyMissing")]
    #[non_exhaustive]
    BodyMissing {},

    #[serde(rename = "bodyInvalid")]
    #[non_exhaustive]
    BodyInvalid {},

    #[serde(rename = "excerptTooLong")]
    #[non_exhaustive]
    ExcerptTooLong {
        #[serde(default)]
        maximum: i64,
    },

    #[serde(rename = "tooManyTerms")]
    #[non_exhaustive]
    TooManyTerms {
        field: ArticleViolationTooManyTermsField,
        #[serde(default)]
        maximum: i64,
    },

    #[serde(rename = "termInvalid")]
    #[non_exhaustive]
    TermInvalid {
        field: ArticleViolationTermInvalidField,
    },

    #[serde(rename = "siteTimeInPast")]
    #[non_exhaustive]
    SiteTimeInPast {},

    #[serde(rename = "timeInPast")]
    #[non_exhaustive]
    TimeInPast {},

    #[serde(rename = "coverNotImage")]
    #[non_exhaustive]
    CoverNotImage {},

    /// Catch-all variant for unrecognized discriminant values.
    /// If the server sends a discriminant not recognized by the current SDK
    /// version, the raw payload is captured here so callers can still inspect it.
    #[serde(untagged)]
    __Unknown(serde_json::Value),
}

impl ArticleViolation {
    pub fn title_missing() -> Self {
        Self::TitleMissing {}
    }

    pub fn title_too_long(maximum: i64) -> Self {
        Self::TitleTooLong { maximum }
    }

    pub fn body_missing() -> Self {
        Self::BodyMissing {}
    }

    pub fn body_invalid() -> Self {
        Self::BodyInvalid {}
    }

    pub fn excerpt_too_long(maximum: i64) -> Self {
        Self::ExcerptTooLong { maximum }
    }

    pub fn too_many_terms(field: ArticleViolationTooManyTermsField, maximum: i64) -> Self {
        Self::TooManyTerms { field, maximum }
    }

    pub fn term_invalid(field: ArticleViolationTermInvalidField) -> Self {
        Self::TermInvalid { field }
    }

    pub fn site_time_in_past() -> Self {
        Self::SiteTimeInPast {}
    }

    pub fn time_in_past() -> Self {
        Self::TimeInPast {}
    }

    pub fn cover_not_image() -> Self {
        Self::CoverNotImage {}
    }

    pub fn unknown(value: serde_json::Value) -> Self {
        Self::__Unknown(value)
    }
}
