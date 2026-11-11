# frozen_string_literal: true

require_relative "../../peal"

module Peal
  module Types
    module LivePostBlocker
      extend Peal::Internal::Types::Enum

      NO_API = "noApi"
      PERMISSION = "permission"
      UNVERIFIED = "unverified"
    end
  end
end
