# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module LivePostChangeStatus
      extend Peal::Internal::Types::Enum

      PENDING = "pending"
      DONE = "done"
      FAILED = "failed"
    end
  end
end
