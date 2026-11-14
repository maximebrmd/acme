# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ArticleSiteStatus
      extend Peal::Internal::Types::Enum

      PUBLISH = "publish"
      DRAFT = "draft"
      FUTURE = "future"
    end
  end
end
