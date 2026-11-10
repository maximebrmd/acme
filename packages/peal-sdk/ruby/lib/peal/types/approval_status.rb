# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module ApprovalStatus
      extend Peal::Internal::Types::Enum

      PENDING = "pending"
      APPROVED = "approved"
      CHANGES_REQUESTED = "changesRequested"
      WITHDRAWN = "withdrawn"
    end
  end
end
