# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ArticleStateName
      extend Peal::Internal::Types::Enum

      DRAFT = "draft"
      SCHEDULED = "scheduled"
      PUBLISHING = "publishing"
      PUBLISHED = "published"
      FAILED = "failed"
      UNCONFIRMED = "unconfirmed"
    end
  end
end
