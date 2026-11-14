# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    class ArticleState < Internal::Types::Model
      extend Peal::Internal::Types::Union

      discriminant :type

      member -> { Peal::Types::ArticleStateDraft }, key: "DRAFT"

      member -> { Peal::Types::ArticleStateScheduled }, key: "SCHEDULED"

      member -> { Peal::Types::ArticleStatePublishing }, key: "PUBLISHING"

      member -> { Peal::Types::ArticleStatePublished }, key: "PUBLISHED"

      member -> { Peal::Types::ArticleStateFailed }, key: "FAILED"

      member -> { Peal::Types::ArticleStateUnconfirmed }, key: "UNCONFIRMED"
    end
  end
end
