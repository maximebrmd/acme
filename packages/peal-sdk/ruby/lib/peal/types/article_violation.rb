# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ArticleViolation < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::ArticleViolationTitleMissing }, key: "TITLE_MISSING"

      member -> { Peal::Types::ArticleViolationTitleTooLong }, key: "TITLE_TOO_LONG"

      member -> { Peal::Types::ArticleViolationBodyMissing }, key: "BODY_MISSING"

      member -> { Peal::Types::ArticleViolationBodyInvalid }, key: "BODY_INVALID"

      member -> { Peal::Types::ArticleViolationExcerptTooLong }, key: "EXCERPT_TOO_LONG"

      member -> { Peal::Types::ArticleViolationTooManyTerms }, key: "TOO_MANY_TERMS"

      member -> { Peal::Types::ArticleViolationTermInvalid }, key: "TERM_INVALID"

      member -> { Peal::Types::ArticleViolationSiteTimeInPast }, key: "SITE_TIME_IN_PAST"

      member -> { Peal::Types::ArticleViolationTimeInPast }, key: "TIME_IN_PAST"

      member -> { Peal::Types::ArticleViolationCoverNotImage }, key: "COVER_NOT_IMAGE"
    end
  end
end
