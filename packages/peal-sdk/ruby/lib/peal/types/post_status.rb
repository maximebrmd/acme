# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module PostStatus
      extend Peal::Internal::Types::Enum

      DRAFT = "draft"
      SCHEDULED = "scheduled"
      PUBLISHING = "publishing"
      FINISHED = "finished"
      CANCELLED = "cancelled"
    end
  end
end
