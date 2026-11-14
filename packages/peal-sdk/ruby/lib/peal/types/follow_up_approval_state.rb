# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module FollowUpApprovalState
      extend Peal::Internal::Types::Enum

      NOT_NEEDED = "notNeeded"
      PENDING = "pending"
      APPROVED = "approved"
    end
  end
end
