# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PostNotPromotableEncodedReason
      extend Peal::Internal::Types::Enum

      NOT_PUBLISHED = "notPublished"
      PLATFORM = "platform"
      CONNECTION = "connection"
    end
  end
end
