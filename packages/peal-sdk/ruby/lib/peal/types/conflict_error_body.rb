# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ConflictErrorBody < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::PostNotReviewableEncoded }, key: "POST_NOT_REVIEWABLE"

      member -> { Peal::Types::TooManyReviewLinksEncoded }, key: "TOO_MANY_REVIEW_LINKS"
    end
  end
end
